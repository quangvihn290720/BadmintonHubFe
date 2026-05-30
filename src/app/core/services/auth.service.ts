import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { MOCK_STAFF } from '../mock-data';
import { ApiConfigService } from './api-config.service';
import { API_ENDPOINTS } from '../constants/api-endpoints';

export interface StaffMember {
  id: number;
  name: string;
  username: string;
  role: 'staff' | 'admin';
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);
  
  private readonly STORAGE_KEY = 'badmintonhub_auth';

  private readonly staffListSignal = signal<StaffMember[]>([...MOCK_STAFF] as StaffMember[]);
  readonly staffList = this.staffListSignal.asReadonly();

  readonly currentUser = signal<{ id: number; name: string; username: string; role: 'staff' | 'admin' } | null>(
    localStorage.getItem(this.STORAGE_KEY) ? JSON.parse(localStorage.getItem(this.STORAGE_KEY)!) : null
  );

  constructor() {
    this.fetchStaff();
  }

  fetchStaff(): void {
    if (this.apiConfig.isMockMode()) return;
    
    this.http.get<StaffMember[]>(API_ENDPOINTS.STAFF.BASE)
      .pipe(
        catchError((err: any) => {
          return of([] as StaffMember[]);
        })
      )
      .subscribe((list: StaffMember[]) => {
        if (list && list.length > 0) {
          this.staffListSignal.set(list);
        }
      });
  }

  getAllStaff(): StaffMember[] {
    return [...this.staffListSignal()];
  }

  addStaff(staff: Omit<StaffMember, 'id'>): void {
    if (this.apiConfig.isMockMode()) {
      this.staffListSignal.update(list => {
        const id = list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1;
        return [...list, { id, ...staff } as StaffMember];
      });
    } else {
      this.http.post<StaffMember>(API_ENDPOINTS.STAFF.BASE, staff)
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          if (res) this.fetchStaff();
        });
    }
  }

  updateStaff(updated: Partial<StaffMember> & { id: number }): void {
    if (this.apiConfig.isMockMode()) {
      this.staffListSignal.update(list => {
        const idx = list.findIndex(s => s.id === updated.id);
        if (idx !== -1) {
          const copy = [...list];
          copy[idx] = { ...copy[idx], ...updated } as StaffMember;
          return copy;
        }
        return list;
      });
    } else {
      this.http.put<StaffMember>(API_ENDPOINTS.STAFF.DETAIL(updated.id), updated)
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          if (res) this.fetchStaff();
        });
    }
  }

  deleteStaff(id: number): void {
    if (this.apiConfig.isMockMode()) {
      this.staffListSignal.update(list => list.filter(s => s.id !== id));
    } else {
      this.http.delete<any>(API_ENDPOINTS.STAFF.DETAIL(id))
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.fetchStaff();
        });
    }
  }

  login(username: string, password: string): Observable<{ success: boolean; message: string }> {
    if (this.apiConfig.isMockMode()) {
      const staff = this.staffListSignal().find(s => s.username === username && s.password === password);
      if (staff) {
        const authData = { id: staff.id, name: staff.name, username: staff.username, role: staff.role };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
        this.currentUser.set(authData);
        return of({ success: true, message: 'Đăng nhập giả lập thành công' });
      }
      return of({ success: false, message: 'Tên đăng nhập hoặc mật khẩu giả lập không đúng' });
    } else {
      return this.http.post<any>(API_ENDPOINTS.AUTH.LOGIN, { username, password })
        .pipe(
          tap((res: any) => {
            if (res && res.token) {
              this.apiConfig.setToken(res.token);
              const authData = {
                id: res.user.id,
                name: res.user.name,
                username: res.user.username,
                role: res.user.role
              };
              localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
              this.currentUser.set(authData);
              this.fetchStaff();
            }
          }),
          map((res: any) => ({ success: true, message: 'Đăng nhập thành công' })),
          catchError((err: any) => {
            const msg = err.error?.message || 'Không thể kết nối đến Backend API port 4201.';
            return of({ success: false, message: msg });
          })
        );
    }
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.apiConfig.setToken(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY);
  }

  getCurrentStaff(): { id: number; name: string; username: string; role: string } | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  getStaffName(): string {
    const staff = this.getCurrentStaff();
    return staff ? staff.name : 'Nhân viên';
  }
}
