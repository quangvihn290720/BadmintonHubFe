import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Customer } from '../models';
import { MOCK_CUSTOMERS } from '../mock-data';
import { ApiConfigService } from './api-config.service';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class MockCustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  private readonly customersSignal = signal<Customer[]>([...MOCK_CUSTOMERS]);
  
  readonly customers = this.customersSignal.asReadonly();
  readonly blacklistedCustomers = computed(() => this.customersSignal().filter(c => c.isBlacklisted));

  constructor() {
    this.fetchCustomers();
  }

  fetchCustomers(): void {
    if (this.apiConfig.isMockMode()) return;

    this.http.get<Customer[]>(API_ENDPOINTS.CUSTOMERS.BASE)
      .pipe(
        catchError((err: any) => {
          return of([] as Customer[]);
        })
      )
      .subscribe((list: Customer[]) => {
        if (list && list.length > 0) {
          this.customersSignal.set(list);
        }
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

  isBlacklisted(phone: string): { isBlacklisted: boolean; customer?: Customer; reason?: string } {
    const customer = this.findByPhone(phone);
    if (customer && customer.isBlacklisted) {
      return { isBlacklisted: true, customer, reason: customer.blacklistReason };
    }
    return { isBlacklisted: false, customer };
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

    if (this.apiConfig.isMockMode()) {
      this.customersSignal.update(list => [...list, newCustomer]);
    } else {
      this.http.post<Customer>(API_ENDPOINTS.CUSTOMERS.BASE, newCustomer)
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          if (res) this.fetchCustomers();
        });
      // Optimistic update
      this.customersSignal.update(list => [...list, newCustomer]);
    }

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
    
    this.customersSignal.update(list => {
      const idx = list.findIndex(c => c.id === customer!.id);
      if (idx !== -1) {
        const copy = [...list];
        const currentPoints = copy[idx].points || 0;
        copy[idx] = {
          ...copy[idx],
          totalBookings: copy[idx].totalBookings + 1,
          points: currentPoints + pointsToAdd
        };
        return copy;
      }
      return list;
    });

    if (!this.apiConfig.isMockMode()) {
      const payload = { totalPaid, pointsToAdd };
      this.http.post<any>(API_ENDPOINTS.CUSTOMERS.BOOKING(customer.id), payload)
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.fetchCustomers();
        });
    }
  }
}
