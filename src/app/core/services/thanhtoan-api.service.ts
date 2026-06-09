import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';

export interface ThanhToanSummary {
  id: string;
  lichdatId: string;
  type: string;
  method: string;
  amount: number;
  status: string;
  paidAt: string;
}

@Injectable({ providedIn: 'root' })
export class ThanhToanApiService {
  private readonly http = inject(HttpClient);

  listByDate(date: string): Observable<ThanhToanSummary[]> {
    return (this.http.get(API_ENDPOINTS.THANH_TOANS.BASE, { params: { date } }) as Observable<ApiResponse<ThanhToanSummary[]>>).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    );
  }

  listByLichDat(lichdatId: string): Observable<ThanhToanSummary[]> {
    return (this.http.get(API_ENDPOINTS.THANH_TOANS.BASE, { params: { lichdatId } }) as Observable<ApiResponse<ThanhToanSummary[]>>).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    );
  }
}
