import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { CourtType, PricingRule } from '../models';
import { MOCK_PRICING_RULES } from '../mock-data';
import { ApiConfigService } from './api-config.service';
import { API_ENDPOINTS } from '../constants/api-endpoints';

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

  private readonly rulesSignal = signal<PricingRule[]>([...MOCK_PRICING_RULES]);
  readonly rules = this.rulesSignal.asReadonly();

  constructor() {
    this.fetchRules();
  }

  fetchRules(): void {
    if (this.apiConfig.isMockMode()) return;

    this.http.get<PricingRule[]>(API_ENDPOINTS.PRICING.BASE)
      .pipe(
        catchError((err: any) => {
          return of([] as PricingRule[]);
        })
      )
      .subscribe((list: PricingRule[]) => {
        if (list && list.length > 0) {
          this.rulesSignal.set(list);
        }
      });
  }

  getAllRules(): PricingRule[] {
    return [...this.rulesSignal()];
  }

  updateRule(updated: PricingRule): void {
    this.rulesSignal.update(rules => {
      const idx = rules.findIndex(r => r.id === updated.id);
      if (idx !== -1) {
        const copy = [...rules];
        copy[idx] = { ...updated };
        return copy;
      }
      return rules;
    });

    if (!this.apiConfig.isMockMode()) {
      this.http.put<PricingRule>(API_ENDPOINTS.PRICING.DETAIL(updated.id), updated)
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.fetchRules();
        });
    }
  }

  addRule(rule: Omit<PricingRule, 'id'>): void {
    const nextId = this.rulesSignal().length > 0 ? Math.max(...this.rulesSignal().map(r => r.id)) + 1 : 1;
    const newRule: PricingRule = { id: nextId, ...rule };

    this.rulesSignal.update(rules => [...rules, newRule]);

    if (!this.apiConfig.isMockMode()) {
      this.http.post<PricingRule>(API_ENDPOINTS.PRICING.BASE, newRule)
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          if (res) this.fetchRules();
        });
    }
  }

  deleteRule(id: number): void {
    this.rulesSignal.update(rules => rules.filter(r => r.id !== id));

    if (!this.apiConfig.isMockMode()) {
      this.http.delete<any>(API_ENDPOINTS.PRICING.DETAIL(id))
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.fetchRules();
        });
    }
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
    const suggestedDeposit = Math.round(totalAmount * depositPercent / 100);

    return {
      courtFee,
      peakSurcharge,
      discount,
      totalAmount,
      suggestedDeposit,
      depositPercent,
      hours,
      pricePerHour,
      isPeak
    };
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
