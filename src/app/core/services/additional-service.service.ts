import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, from, of } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { BackendServiceItem } from '../models/backend-api.model';
import { ApiConfigService } from './api-config.service';
import { ServiceItemApiService } from './service-item-api.service';

export interface ServiceItem {
  id: number;
  key: string;
  name: string;
  price: number;
  type?: string;
  stockQuantity?: number;
  status?: string;
  quantity?: number;
}

@Injectable({ providedIn: 'root' })
export class AdditionalServiceService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);
  private readonly serviceItemApi = inject(ServiceItemApiService);

  private readonly servicesSignal = signal<ServiceItem[]>([]);

  readonly services = this.servicesSignal.asReadonly();
  private nextId = 1;

  constructor() {
    this.fetchServices();
  }

  fetchServices(): void {
    if (this.apiConfig.isMockMode()) return;
    this.serviceItemApi.list().subscribe(items => {
      this.servicesSignal.set(items.map((item, index) => ({
        id: index + 1,
        key: item.id,
        name: item.tenDichVu || item.name || `Dich vu ${index + 1}`,
        price: Number(item.giaBan ?? item.price ?? 0),
        type: item.loaiDichVu || item.type,
        stockQuantity: item.tonKho ?? item.stockQuantity,
        status: item.trangThai || item.status
      })));
      this.nextId = items.length + 1;
    });
  }

  getServices(): ServiceItem[] {
    return [...this.servicesSignal()];
  }

  addService(name: string, price: number): void {
    const key = 'service_' + Date.now();
    const newService: ServiceItem = {
      id: this.nextId++,
      key,
      name,
      price
    };
    this.servicesSignal.update(list => [...list, newService]);
    if (this.apiConfig.isMockMode()) return;

    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    (this.http.post(API_ENDPOINTS.ADMIN.SERVICE_ITEMS, {
      name,
      type: 'DRINK',
      price,
      stockQuantity: 0,
      status: 'ACTIVE'
    }, { headers }) as Observable<ApiResponse<BackendServiceItem>>)
      .pipe(catchError(() => of(null)))
      .subscribe(response => {
        if (response?.data) this.fetchServices();
      });
  }

  updateService(id: number, name: string, price: number): void {
    this.servicesSignal.update(list => {
      const idx = list.findIndex(s => s.id === id);
      if (idx !== -1) {
        const copy = [...list];
        copy[idx] = { ...copy[idx], name, price };
        return copy;
      }
      return list;
    });
    if (this.apiConfig.isMockMode()) return;
    const existing = this.servicesSignal().find(item => item.id === id);
    if (!existing?.key) return;
    (this.http.put(API_ENDPOINTS.ADMIN.SERVICE_ITEMS + `/${existing.key}`, {
      name,
      type: existing.type || 'DRINK',
      price,
      stockQuantity: existing.stockQuantity || 0,
      status: existing.status || 'ACTIVE'
    }) as Observable<ApiResponse<BackendServiceItem>>)
      .pipe(catchError(() => of(null)))
      .subscribe(response => {
        if (response?.data) this.fetchServices();
      });
  }

  deleteService(id: number): void {
    const existing = this.servicesSignal().find(item => item.id === id);
    this.servicesSignal.update(list => list.filter(s => s.id !== id));
    if (this.apiConfig.isMockMode()) return;
    if (!existing?.key) return;
    (this.http.patch(API_ENDPOINTS.ADMIN.SERVICE_ITEM_STATUS(existing.key), { status: 'INACTIVE' }) as Observable<ApiResponse<BackendServiceItem>>)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.fetchServices());
  }
}
