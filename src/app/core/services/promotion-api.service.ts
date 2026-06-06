import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { BackendPromotion } from '../models/backend-api.model';

@Injectable({ providedIn: 'root' })
export class PromotionApiService {
  private readonly http = inject(HttpClient);

  listAvailable(): Observable<BackendPromotion[]> {
    return (this.http.get(API_ENDPOINTS.PROMOTIONS.AVAILABLE) as Observable<ApiResponse<BackendPromotion[]>>).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    );
  }

  applyPromotion(bookingId: string, promotionCode: string): Observable<unknown> {
    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    return (this.http.post(API_ENDPOINTS.PROMOTIONS.APPLY(bookingId), { promotionCode }, { headers }) as Observable<ApiResponse<unknown>>).pipe(
      map(response => response.data)
    );
  }
}
