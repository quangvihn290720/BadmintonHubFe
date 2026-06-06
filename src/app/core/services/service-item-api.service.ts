import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { BackendServiceItem } from '../models/backend-api.model';

@Injectable({ providedIn: 'root' })
export class ServiceItemApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<BackendServiceItem[]> {
    return (this.http.get(API_ENDPOINTS.SERVICE_ITEMS.BASE) as Observable<ApiResponse<BackendServiceItem[]>>).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    );
  }
}
