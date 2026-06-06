import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { finalize, from, map, Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { BackendCourt } from '../models/backend-api.model';
import { Court } from '../models';
import { ApiConfigService } from './api-config.service';

@Injectable({ providedIn: 'root' })
export class CourtApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);
  private readonly backendCourts = signal<BackendCourt[]>([]);
  private readonly adminCourtsSignal = signal<BackendCourt[]>([]);
  private readonly courtsSignal = signal<Court[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly courts = this.courtsSignal.asReadonly();
  readonly adminCourts = this.adminCourtsSignal.asReadonly();

  constructor() {
    this.loadCourts().subscribe();
  }

  loadCourts(): Observable<Court[]> {
    return (this.http.get(API_ENDPOINTS.COURTS.BASE) as Observable<ApiResponse<BackendCourt[]>>).pipe(
      map(response => response.data || []),
      tap(courts => {
        this.backendCourts.set(courts);
        this.courtsSignal.set(courts.map((court: BackendCourt, index: number) => ({
          id: index + 1,
          name: court.code,
          type: court.basePricePerHour >= 150000 ? 'vip' : 'standard',
          description: court.locationNote || court.status
        })));
      }),
      map(() => this.courtsSignal())
    );
  }

  loadAdminCourts(): Observable<BackendCourt[]> {
    this.loading.set(true);
    this.error.set(null);
    return (this.http.get(API_ENDPOINTS.ADMIN.COURTS) as Observable<ApiResponse<BackendCourt[]>>).pipe(
      map(response => response.data || []),
      tap(courts => this.adminCourtsSignal.set(courts)),
      finalize(() => this.loading.set(false))
    );
  }

  createCourt(payload: Omit<BackendCourt, 'id'>): Observable<BackendCourt> {
    return (this.http.post(API_ENDPOINTS.ADMIN.COURTS, payload, {
      headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() })
    }) as Observable<ApiResponse<BackendCourt>>).pipe(map(response => response.data));
  }

  updateCourt(court: BackendCourt): Observable<BackendCourt> {
    return (this.http.put(`${API_ENDPOINTS.ADMIN.COURTS}/${court.id}`, {
      code: court.code,
      basePricePerHour: court.basePricePerHour,
      locationNote: court.locationNote,
      status: court.status
    }) as Observable<ApiResponse<BackendCourt>>).pipe(map(response => response.data));
  }

  updateCourtStatus(id: string, status: string): Observable<BackendCourt> {
    return from(this.patch(API_ENDPOINTS.ADMIN.COURT_STATUS(id), { status }) as Promise<ApiResponse<BackendCourt>>).pipe(
      map(response => response.data)
    );
  }

  getBackendCourtId(uiCourtId: number): string | null {
    return this.backendCourts()[uiCourtId - 1]?.id || null;
  }

  getUiCourtId(backendCourtId: string): number {
    const index = this.backendCourts().findIndex(court => court.id === backendCourtId);
    return index >= 0 ? index + 1 : 0;
  }

  getCourtName(uiCourtId: number): string {
    return this.courtsSignal().find(court => court.id === uiCourtId)?.name || `Court ${uiCourtId}`;
  }

  private patch(path: string, body: unknown): Promise<unknown> {
    return fetch(`${this.apiConfig.backendUrl()}${path}`, {
      method: 'PATCH',
      headers: this.fetchHeaders(),
      body: JSON.stringify(body)
    }).then(response => response.json());
  }

  private fetchHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-Id': crypto.randomUUID()
    };
    const token = this.apiConfig.token();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }
}
