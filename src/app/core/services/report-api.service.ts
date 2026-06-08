import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { DailyRevenueReport } from '../models/backend-api.model';
import {
  BackendDailyRevenueReportResponse,
  normalizeDailyRevenueReport
} from '../utils/backend-contract.utils';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly http = inject(HttpClient);

  getDailyRevenue(date: string): Observable<DailyRevenueReport | null> {
    return (this.http.get(API_ENDPOINTS.REPORTS.DAILY_REVENUE, {
      params: { date }
    }) as Observable<ApiResponse<BackendDailyRevenueReportResponse>>).pipe(
      map(response => response.data ? normalizeDailyRevenueReport(response.data) : null)
    );
  }

  getRevenueRange(from: string, to: string): Observable<DailyRevenueReport[]> {
    return (this.http.get(API_ENDPOINTS.REPORTS.REVENUE_RANGE, {
      params: { from, to }
    }) as Observable<ApiResponse<BackendDailyRevenueReportResponse[]>>).pipe(
      map(response => (response.data || []).map(report => normalizeDailyRevenueReport(report)))
    );
  }
}
