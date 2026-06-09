import { Injectable, signal } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface RuntimeConfig {
  apiBaseUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  private readonly TOKEN_KEY = 'badmintonhub_token';
  private readonly runtimeConfig = ((window as unknown as { __BADMINTONHUB_CONFIG__?: RuntimeConfig }).__BADMINTONHUB_CONFIG__) || {};
  private readonly apiBaseUrl = this.normalizeApiBaseUrl(this.runtimeConfig.apiBaseUrl || environment.apiBaseUrl);
  private readonly backendBaseUrl = this.apiBaseUrl.replace(/\/api\/v1\/?$/, '');

  readonly isMockMode = signal<boolean>(false);
  readonly backendUrl = signal<string>(this.apiBaseUrl);
  readonly backendBase = signal<string>(this.backendBaseUrl);
  readonly token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  readonly httpError = signal<string | null>(null);
  readonly httpSuccess = signal<string | null>(null);

  toggleMockMode(): void {
    this.isMockMode.set(false);
    localStorage.removeItem('badmintonhub_mock_mode');
  }

  setToken(t: string | null): void {
    this.token.set(t);
    if (t) {
      localStorage.setItem(this.TOKEN_KEY, t);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  triggerError(message: string): void {
    this.httpSuccess.set(null);
    this.httpError.set(message);
    setTimeout(() => {
      if (this.httpError() === message) {
        this.httpError.set(null);
      }
    }, 4000);
  }

  triggerSuccess(message: string): void {
    this.httpError.set(null);
    this.httpSuccess.set(message);
    setTimeout(() => {
      if (this.httpSuccess() === message) {
        this.httpSuccess.set(null);
      }
    }, 3000);
  }

  getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Request-Id': crypto.randomUUID()
    });
    const t = this.token();
    if (t) {
      headers = headers.set('Authorization', `Bearer ${t}`);
    }
    return headers;
  }

  private normalizeApiBaseUrl(value: string): string {
    const trimmed = value.replace(/\/$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }
}
