import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { BackendPromotion, KhuyenMaiApi } from '../models/backend-api.model';

export interface PromotionFormData {
  code: string;
  loaiGiamGia: 'PERCENT' | 'FIXED_AMOUNT';
  discountValue: number;
  remainingQuantity: number;
  expiredAt: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class PromotionApiService {
  private readonly http = inject(HttpClient);

  private readonly promotionsSignal = signal<BackendPromotion[]>([]);
  readonly adminPromotions = this.promotionsSignal.asReadonly();

  listAvailable(): Observable<BackendPromotion[]> {
    return (this.http.get(API_ENDPOINTS.PROMOTIONS.AVAILABLE) as Observable<ApiResponse<BackendPromotion[]>>).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    );
  }

  loadAdminPromotions(): Observable<BackendPromotion[]> {
    return (this.http.get(API_ENDPOINTS.ADMIN.KHUYEN_MAIS) as Observable<ApiResponse<BackendPromotion[]>>).pipe(
      map(response => response.data || []),
      tap(items => this.promotionsSignal.set(items)),
      catchError(() => of([]))
    );
  }

  applyPromotion(bookingId: string, promotionCode: string): Observable<unknown> {
    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    return (this.http.post(
      API_ENDPOINTS.PROMOTIONS.APPLY(bookingId),
      { khuyenmaiCode: promotionCode },
      { headers }
    ) as Observable<ApiResponse<unknown>>).pipe(map(response => response.data));
  }

  createPromotion(data: PromotionFormData): Observable<BackendPromotion> {
    return (this.http.post(API_ENDPOINTS.ADMIN.KHUYEN_MAIS, data) as Observable<ApiResponse<BackendPromotion>>).pipe(
      map(response => response.data),
      tap(() => this.loadAdminPromotions().subscribe())
    );
  }

  updatePromotion(id: string, data: PromotionFormData): Observable<BackendPromotion> {
    return (this.http.put(`${API_ENDPOINTS.ADMIN.KHUYEN_MAIS}/${id}`, data) as Observable<ApiResponse<BackendPromotion>>).pipe(
      map(response => response.data),
      tap(() => this.loadAdminPromotions().subscribe())
    );
  }

  updateStatus(id: string, status: string): Observable<BackendPromotion> {
    return (this.http.patch(API_ENDPOINTS.ADMIN.KHUYEN_MAI_STATUS(id), { status }) as Observable<ApiResponse<BackendPromotion>>).pipe(
      map(response => response.data),
      tap(() => this.loadAdminPromotions().subscribe())
    );
  }

  promotionCode(item: BackendPromotion | KhuyenMaiApi): string {
    return item.maCode || item.code || '';
  }

  discountLabel(item: BackendPromotion): string {
    const type = item.loaiGiamGia || 'FIXED_AMOUNT';
    const value = item.giaTriGiam ?? item.discountValue ?? 0;
    return type === 'PERCENT' ? `${value}%` : `${value.toLocaleString('vi-VN')}đ`;
  }
}
