import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { Customer } from '../models';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { BackendCustomer } from '../models/backend-api.model';
import { ApiConfigService } from './api-config.service';

@Injectable({ providedIn: 'root' })
export class MockCustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  private readonly customersSignal = signal<Customer[]>([]);
  readonly customers = this.customersSignal.asReadonly();
  readonly blacklistedCustomers = computed(() => this.customersSignal().filter(c => c.isBlacklisted));

  constructor() {
    this.fetchCustomers();
  }

  fetchCustomers(keyword = ''): void {
    this.listCustomers(keyword).subscribe();
  }

  listCustomers(keyword = ''): Observable<Customer[]> {
    return (this.http.get(API_ENDPOINTS.CUSTOMERS.BASE, {
      params: keyword ? { keyword } : {}
    }) as Observable<ApiResponse<BackendCustomer[]>>).pipe(
      map(response => (response.data || []).map((item, index) => this.toUiCustomer(item, index))),
      tap(customers => this.customersSignal.set(customers)),
      catchError(() => of([]))
    );
  }

  getAllCustomers(): Customer[] {
    return [...this.customersSignal()];
  }

  getBlacklistedCustomers(): Customer[] {
    return this.blacklistedCustomers();
  }

  findByPhone(phone: string): Customer | undefined {
    return this.customersSignal().find(c => c.phone === phone);
  }

  findById(id: number): Customer | undefined {
    return this.customersSignal().find(c => c.id === id);
  }

  getBackendCustomerId(id: number | null | undefined): string | null {
    if (!id) return null;
    return this.findById(id)?.backendId || null;
  }

  isBlacklisted(phone: string): { isBlacklisted: boolean; customer?: Customer; reason?: string } {
    const customer = this.findByPhone(phone);
    if (customer?.isBlacklisted) {
      return { isBlacklisted: true, customer, reason: customer.blacklistReason };
    }
    return { isBlacklisted: false, customer };
  }

  findByPhoneBackend(phone: string): Observable<Customer | null> {
    const local = this.findByPhone(phone);
    if (local) {
      return of(local);
    }
    return (this.http.get(`${API_ENDPOINTS.CUSTOMERS.BASE}/by-phone/${phone}`) as Observable<ApiResponse<BackendCustomer | null>>).pipe(
      map(response => {
        if (response.data) {
          const uiCust = this.toUiCustomer(response.data, this.customersSignal().length);
          this.customersSignal.update(list => [...list, uiCust]);
          return uiCust;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  addCustomerAsync(c: Omit<Customer, 'id' | 'totalBookings' | 'joinDate' | 'isBlacklisted' | 'points'>): Observable<Customer> {
    const today = new Date().toISOString().split('T')[0];
    const newCustomer: Customer = {
      id: this.customersSignal().length > 0 ? Math.max(...this.customersSignal().map(cust => cust.id)) + 1 : 1,
      totalBookings: 0,
      joinDate: today,
      isBlacklisted: false,
      points: 0,
      ...c
    };

    this.customersSignal.update(list => [...list, newCustomer]);

    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    return (this.http.post(API_ENDPOINTS.CUSTOMERS.BASE, {
      fullName: c.name,
      phoneNumber: c.phone,
      email: c.email,
      status: 'ACTIVE'
    }, { headers }) as Observable<ApiResponse<BackendCustomer>>).pipe(
      map(response => {
        const saved = this.toUiCustomer(response.data, newCustomer.id - 1);
        const finalSaved = { ...saved, id: newCustomer.id };
        this.customersSignal.update(list => list.map(item => item.id === newCustomer.id ? finalSaved : item));
        return finalSaved;
      }),
      catchError(() => {
        return of(newCustomer);
      })
    );
  }

  addCustomer(c: Omit<Customer, 'id' | 'totalBookings' | 'joinDate' | 'isBlacklisted' | 'points'>): Customer {
    const today = new Date().toISOString().split('T')[0];
    const newCustomer: Customer = {
      id: this.customersSignal().length > 0 ? Math.max(...this.customersSignal().map(cust => cust.id)) + 1 : 1,
      totalBookings: 0,
      joinDate: today,
      isBlacklisted: false,
      points: 0,
      ...c
    };

    this.customersSignal.update(list => [...list, newCustomer]);

    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    (this.http.post(API_ENDPOINTS.CUSTOMERS.BASE, {
      fullName: c.name,
      phoneNumber: c.phone,
      email: c.email,
      status: 'ACTIVE'
    }, { headers }) as Observable<ApiResponse<BackendCustomer>>).pipe(
      map(response => this.toUiCustomer(response.data, newCustomer.id - 1)),
      catchError(() => of(newCustomer))
    ).subscribe(saved => {
      this.customersSignal.update(list => list.map(item => item.id === newCustomer.id ? { ...saved, id: newCustomer.id } : item));
    });

    return newCustomer;
  }

  addCompletedBooking(phone: string, name: string, totalPaid: number): void {
    let customer = this.findByPhone(phone);
    if (!customer) {
      customer = this.addCustomer({
        name,
        phone,
        email: `${phone.replace(/\s+/g, '')}@badmintonhub.com`
      });
    }

    const pointsToAdd = Math.floor(totalPaid / 10000);
    this.customersSignal.update(list => list.map(item => item.id === customer!.id
      ? { ...item, totalBookings: item.totalBookings + 1, points: (item.points || 0) + pointsToAdd }
      : item));
  }

  private toUiCustomer(item: BackendCustomer, index: number): Customer {
    const status = item.trangThai || item.status || 'ACTIVE';
    return {
      id: index + 1,
      backendId: item.id,
      name: item.ten || item.fullName || `Khach hang ${index + 1}`,
      phone: item.soDienThoai || item.phoneNumber || '',
      email: item.email || '',
      isBlacklisted: status === 'BLACKLIST' || status === 'BLACKLISTED',
      blacklistReason: status === 'BLACKLIST' || status === 'BLACKLISTED' ? 'Backend customer status is BLACKLISTED' : undefined,
      totalBookings: Number(item.totalBookings ?? item.totalLichDats ?? 0),
      joinDate: item.createdAt?.slice(0, 10) || new Date().toISOString().split('T')[0],
      points: 0
    };
  }
}
