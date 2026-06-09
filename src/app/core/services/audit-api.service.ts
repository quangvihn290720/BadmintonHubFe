import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  newValue: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly http = inject(HttpClient);

  listLogs(limit = 50): Observable<AuditLogEntry[]> {
    return (this.http.get(API_ENDPOINTS.AUDIT.LOGS, { params: { limit } }) as Observable<ApiResponse<AuditLogEntry[]>>).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    );
  }
}
