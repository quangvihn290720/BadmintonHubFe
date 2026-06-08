export type BackendRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'QUAN_LY' | 'THU_NGAN';
export type UiRole = 'admin' | 'staff';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  employeeId?: string;
  nhanvienId?: string;
  username: string;
  role: BackendRole;
}

export interface AuthSession {
  id: string;
  name: string;
  username: string;
  role: UiRole;
  backendRole: BackendRole;
  accessToken: string;
  expiresAt: number;
}
