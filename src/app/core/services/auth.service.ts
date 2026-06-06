import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { AuthSession, BackendRole, LoginResponse } from '../models/auth.model';
import { BackendEmployee } from '../models/backend-api.model';
import { ApiConfigService } from './api-config.service';

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  role: 'staff' | 'admin';
  backendRole?: BackendRole;
  status?: string;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);
  private readonly STORAGE_KEY = 'badmintonhub_auth';

  private readonly staffListSignal = signal<StaffMember[]>([]);
  readonly staffList = this.staffListSignal.asReadonly();
  readonly currentUser = signal<AuthSession | null>(this.readSession());

  constructor() {
    this.fetchStaff();
  }

  fetchStaff(): void {
    if (this.apiConfig.isMockMode() || !this.hasAnyRole(['ADMIN', 'MANAGER'])) return;
    (this.http.get(API_ENDPOINTS.STAFF.BASE) as Observable<ApiResponse<unknown[]>>)
      .pipe(catchError(() => of({ success: false, code: 'ERROR', message: 'Error', data: [], timestamp: new Date().toISOString() })))
      .subscribe(response => {
        const employees = (response.data || []) as BackendEmployee[];
        this.staffListSignal.set(employees.map(employee => this.toStaffMember(employee)));
      });
  }

  getAllStaff(): StaffMember[] {
    return [...this.staffListSignal()];
  }

  addStaff(staff: Omit<StaffMember, 'id'>): void {
    const local: StaffMember = { id: crypto.randomUUID(), ...staff };
    this.staffListSignal.update(list => [...list, local]);
    if (this.apiConfig.isMockMode()) return;

    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    (this.http.post(API_ENDPOINTS.ADMIN.EMPLOYEES, {
      fullName: staff.name,
      username: staff.username,
      password: staff.password || 'admin123',
      role: staff.role === 'admin' ? 'ADMIN' : 'CASHIER',
      status: 'ACTIVE'
    }, { headers }) as Observable<ApiResponse<BackendEmployee>>)
      .pipe(catchError(() => of(null)))
      .subscribe(response => {
        if (response?.data) {
          const saved = this.toStaffMember(response.data);
          this.staffListSignal.update(list => list.map(item => item.id === local.id ? saved : item));
        }
      });
  }

  updateStaff(updated: Partial<StaffMember> & { id: string }): void {
    this.staffListSignal.update(list => {
      const idx = list.findIndex(s => s.id === updated.id);
      if (idx === -1) return list;
      const copy = [...list];
      copy[idx] = { ...copy[idx], ...updated } as StaffMember;
      return copy;
    });
    if (this.apiConfig.isMockMode()) return;
    const existing = this.staffListSignal().find(s => s.id === updated.id);
    if (!existing) return;
    const role = updated.role === 'admin' ? 'ADMIN' : 'CASHIER';
    (this.http.patch(API_ENDPOINTS.ADMIN.EMPLOYEE_ROLE(existing.id), { role }) as Observable<ApiResponse<BackendEmployee>>)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.fetchStaff());
  }

  deleteStaff(id: string): void {
    this.staffListSignal.update(list => list.filter(s => s.id !== id));
    if (this.apiConfig.isMockMode()) return;
    (this.http.patch(API_ENDPOINTS.ADMIN.EMPLOYEE_STATUS(id), { status: 'INACTIVE' }) as Observable<ApiResponse<BackendEmployee>>)
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  login(username: string, password: string): Observable<{ success: boolean; message: string }> {
    return (this.http.post(API_ENDPOINTS.AUTH.LOGIN, { username, password }) as Observable<ApiResponse<LoginResponse>>)
      .pipe(
        tap(response => {
          if (!response.success || !response.data?.accessToken) return;
          const data = response.data;
          this.storeSession({
            id: data.employeeId,
            name: data.username,
            username: data.username,
            role: data.role === 'CASHIER' ? 'staff' : 'admin',
            backendRole: data.role,
            accessToken: data.accessToken,
            expiresAt: Date.now() + data.expiresIn * 1000
          });
        }),
        map(response => ({ success: response.success, message: response.message || 'Dang nhap thanh cong.' })),
        catchError(err => of({
          success: false,
          message: err.error?.message || 'Khong the ket noi Backend API tai http://localhost:8080.'
        }))
      );
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.apiConfig.setToken(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const session = this.readSession();
    return !!session?.accessToken && session.expiresAt > Date.now();
  }

  getCurrentStaff(): AuthSession | null {
    return this.readSession();
  }

  getCurrentSession(): AuthSession | null {
    return this.readSession();
  }

  getCurrentToken(): string | null {
    return this.apiConfig.token();
  }

  hasRole(role: BackendRole): boolean {
    return this.readSession()?.backendRole === role;
  }

  hasAnyRole(roles: BackendRole[]): boolean {
    const role = this.readSession()?.backendRole;
    return !!role && roles.includes(role);
  }

  getStaffName(): string {
    return this.readSession()?.name || 'Nhan vien';
  }

  private storeSession(session: AuthSession): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    this.apiConfig.setToken(session.accessToken);
    this.currentUser.set(session);
  }

  private readSession(): AuthSession | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as AuthSession;
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  private toStaffMember(employee: BackendEmployee): StaffMember {
    return {
      id: employee.id,
      name: employee.fullName,
      username: employee.username,
      role: employee.role === 'CASHIER' ? 'staff' : 'admin',
      backendRole: employee.role as BackendRole,
      status: employee.status
    };
  }
}
