import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { Customer } from '../models';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { BackendCustomer } from '../models/backend-api.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);

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
      catchError(err => throwError(() => err))
    );
  }

  fetchVipPoints(backendId: string): Observable<number> {
    return (this.http.get(API_ENDPOINTS.CUSTOMERS.VIP(backendId)) as Observable<ApiResponse<{ diemTichLuy?: number; diem_tich_luy?: number } | null>>).pipe(
      map(response => response.data?.diemTichLuy ?? response.data?.diem_tich_luy ?? 0),
      catchError(() => of(0))
    );
  }

  refreshCustomerVip(customerId: number): void {
    const customer = this.findById(customerId);
    if (!customer?.backendId) return;
    this.fetchVipPoints(customer.backendId).subscribe(points => {
      this.customersSignal.update(list => list.map(item => item.id === customerId ? { ...item, points } : item));
    });
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

  blacklistCustomer(backendId: string, reason: string): Observable<Customer | null> {
    return (this.http.patch(API_ENDPOINTS.CUSTOMERS.BLACKLIST(backendId), { reason }) as Observable<ApiResponse<BackendCustomer>>).pipe(
      map(response => this.mergeUiCustomer(response.data, backendId)),
      tap(customer => {
        if (customer) {
          this.customersSignal.update(list => list.map(item => item.backendId === backendId ? customer : item));
        }
      }),
      catchError(() => of(null))
    );
  }

  activateCustomer(backendId: string): Observable<Customer | null> {
    return (this.http.patch(API_ENDPOINTS.CUSTOMERS.ACTIVATE(backendId), {}) as Observable<ApiResponse<BackendCustomer>>).pipe(
      map(response => this.mergeUiCustomer(response.data, backendId)),
      tap(customer => {
        if (customer) {
          this.customersSignal.update(list => list.map(item => item.backendId === backendId ? customer : item));
        }
      }),
      catchError(() => of(null))
    );
  }

  private mergeUiCustomer(item: BackendCustomer, backendId: string): Customer {
    const existing = this.customersSignal().find(c => c.backendId === backendId);
    const ui = this.toUiCustomer(item, existing ? existing.id - 1 : this.customersSignal().length);
    return existing ? { ...ui, id: existing.id, points: existing.points } : ui;
  }

  addCompletedBooking(phone: string, _name: string, _totalPaid: number): void {
    const customer = this.findByPhone(phone);
    if (customer) {
      this.refreshCustomerVip(customer.id);
      this.fetchCustomers();
    }
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
      blacklistReason: item.blacklistReason ?? undefined,
      totalBookings: Number(item.totalBookings ?? item.totalLichDats ?? 0),
      joinDate: item.createdAt?.slice(0, 10) || new Date().toISOString().split('T')[0],
      points: 0
    };
  }
}
