import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, from, map, of, tap } from 'rxjs';
import { CourtType, PricingRule } from '../models';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { BackendPriceRule } from '../models/backend-api.model';
import { ApiConfigService } from './api-config.service';

export interface PriceCalculation {
  courtFee: number;
  peakSurcharge: number;
  discount: number;
  totalAmount: number;
  suggestedDeposit: number;
  depositPercent: number;
  hours: number;
  pricePerHour: number;
  isPeak: boolean;
}

@Injectable({ providedIn: 'root' })
export class PricingService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  private readonly rulesSignal = signal<PricingRule[]>([]);
  readonly rules = this.rulesSignal.asReadonly();

  constructor() {
    this.fetchRules();
  }

  fetchRules(): void {

    (this.http.get(API_ENDPOINTS.PRICING.BASE) as Observable<ApiResponse<BackendPriceRule[]>>).pipe(
      map(response => response.data || []),
      map(rules => rules.flatMap((rule, index) => this.toUiRules(rule, index))),
      tap(rules => {
        this.rulesSignal.set(rules);
      }),
      catchError(() => of([]))
    ).subscribe();
  }

  getAllRules(): PricingRule[] {
    return [...this.rulesSignal()];
  }

  updateRule(updated: PricingRule): void {
    this.rulesSignal.update(rules => rules.map(rule => rule.id === updated.id ? { ...updated } : rule));

    if (!updated.backendId) return;

    const base = updated.courtType === 'vip' ? 180000 : 100000;
    const multiplier = Number((updated.pricePerHour / base).toFixed(2));
    (this.http.put(API_ENDPOINTS.PRICING.DETAIL(updated.backendId), {
      name: updated.label,
      startTime: `${updated.timeStart}:00`,
      endTime: `${updated.timeEnd}:00`,
      multiplier,
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: null,
      status: 'ACTIVE'
    }) as Observable<ApiResponse<BackendPriceRule>>).pipe(
      catchError(() => of(null))
    ).subscribe(response => {
      if (response?.data) this.fetchRules();
    });
  }

  addRule(rule: Omit<PricingRule, 'id'>): void {
    const nextId = this.rulesSignal().length > 0 ? Math.max(...this.rulesSignal().map(r => r.id)) + 1 : 1;
    const newRule: PricingRule = { id: nextId, ...rule };
    this.rulesSignal.update(rules => [...rules, newRule]);



    const base = rule.courtType === 'vip' ? 180000 : 100000;
    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    (this.http.post(API_ENDPOINTS.PRICING.BASE, {
      name: rule.label,
      startTime: `${rule.timeStart}:00`,
      endTime: `${rule.timeEnd}:00`,
      multiplier: Number((rule.pricePerHour / base).toFixed(2)),
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: null,
      status: 'ACTIVE'
    }, { headers }) as Observable<ApiResponse<BackendPriceRule>>).pipe(
      catchError(() => of(null))
    ).subscribe(response => {
      if (response?.data) this.fetchRules();
    });
  }

  deleteRule(id: number): void {
    const existing = this.rulesSignal().find(rule => rule.id === id);
    this.rulesSignal.update(rules => rules.filter(r => r.id !== id));
    if (!existing?.backendId) return;
    (this.http.patch(API_ENDPOINTS.PRICING.STATUS(existing.backendId), { status: 'INACTIVE' }) as Observable<ApiResponse<BackendPriceRule>>)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.fetchRules());
  }

  calculatePrice(courtType: CourtType, startTime: string, endTime: string, isBlacklistOverride: boolean = false): PriceCalculation {
    const hours = this.calculateHours(startTime, endTime);
    const rule = this.findRule(courtType, startTime);

    const pricePerHour = rule ? rule.pricePerHour : (courtType === 'vip' ? 180000 : 100000);
    const isPeak = rule ? rule.isPeak : false;
    const peakSurchargePerHour = rule ? rule.peakSurcharge : 0;
    const discountPercent = rule ? rule.discount : 0;

    const courtFee = pricePerHour * hours;
    const peakSurcharge = peakSurchargePerHour * hours;
    const subtotal = courtFee + peakSurcharge;
    const discount = Math.round(subtotal * discountPercent / 100);
    const totalAmount = subtotal - discount;
    const depositPercent = isBlacklistOverride ? 100 : 30;

    return {
      courtFee,
      peakSurcharge,
      discount,
      totalAmount,
      suggestedDeposit: Math.round(totalAmount * depositPercent / 100),
      depositPercent,
      hours,
      pricePerHour,
      isPeak
    };
  }

  private toUiRules(rule: BackendPriceRule, index: number): PricingRule[] {
    const active = rule.status === 'ACTIVE';
    if (!active) return [];
    const start = rule.startTime.slice(0, 5);
    const end = rule.endTime.slice(0, 5);
    const isVip = rule.name.toLowerCase().includes('vip');
    const courtTypes: CourtType[] = isVip ? ['vip'] : ['standard', 'vip'];
    return courtTypes.map((courtType, offset) => {
      const base = courtType === 'vip' ? 180000 : 100000;
      const pricePerHour = Math.round(base * Number(rule.multiplier || 1));
      return {
        id: index * 10 + offset + 1,
        backendId: rule.id,
        courtType,
        timeStart: start,
        timeEnd: end,
        pricePerHour,
        isPeak: Number(rule.multiplier || 1) > 1,
        peakSurcharge: Math.max(0, pricePerHour - base),
        discount: 0,
        label: rule.name
      };
    });
  }

  private calculateHours(startTime: string, endTime: string): number {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return (toMin(endTime) - toMin(startTime)) / 60;
  }

  private findRule(courtType: CourtType, startTime: string): PricingRule | undefined {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const startMin = toMin(startTime);
    return this.rulesSignal().find(r =>
      r.courtType === courtType &&
      toMin(r.timeStart) <= startMin &&
      startMin < toMin(r.timeEnd)
    );
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
}
