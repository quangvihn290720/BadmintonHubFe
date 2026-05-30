import { Injectable, signal } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  private readonly MOCK_KEY = 'badmintonhub_mock_mode';
  private readonly TOKEN_KEY = 'badmintonhub_token';

  // Signals
  readonly isMockMode = signal<boolean>(
    localStorage.getItem(this.MOCK_KEY) === 'false' ? false : true
  );
  readonly backendUrl = signal<string>('http://localhost:4201/api');
  readonly token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  readonly httpError = signal<string | null>(null);

  toggleMockMode(): void {
    const nextVal = !this.isMockMode();
    this.isMockMode.set(nextVal);
    localStorage.setItem(this.MOCK_KEY, nextVal.toString());
    // Auto reload to reload data and trigger service fetch
    window.location.reload();
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
    this.httpError.set(message);
    // Auto clear error toast after 4 seconds
    setTimeout(() => {
      if (this.httpError() === message) {
        this.httpError.set(null);
      }
    }, 4000);
  }

  getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const t = this.token();
    if (t) {
      headers = headers.set('Authorization', `Bearer ${t}`);
    }
    return headers;
  }
}
