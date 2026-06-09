import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiConfigService } from './core/services/api-config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
    
    @if (errorMsg()) {
      <div class="toast-error-banner" (click)="clearError()">
        <div class="toast-icon">⚠️</div>
        <div class="toast-content">
          <div class="toast-title">Lỗi hệ thống</div>
          <div class="toast-desc">{{ errorMsg() }}</div>
        </div>
        <button class="toast-close">✕</button>
      </div>
    }
    @if (successMsg()) {
      <div class="toast-success-banner" (click)="clearSuccess()">
        <div class="toast-icon">✅</div>
        <div class="toast-content">
          <div class="toast-title">Thành công</div>
          <div class="toast-desc">{{ successMsg() }}</div>
        </div>
        <button class="toast-close">✕</button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .toast-error-banner {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      background: #ef4444;
      color: white;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.4), 0 4px 6px -2px rgba(239, 68, 68, 0.2);
      cursor: pointer;
      animation: slideIn 0.3s ease forwards;
      max-width: 380px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    @keyframes slideIn {
      from { transform: translateX(120%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .toast-icon {
      font-size: 24px;
    }
    .toast-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .toast-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .toast-desc {
      font-size: 12.5px;
      opacity: 0.95;
      line-height: 1.4;
    }
    .toast-close {
      background: none;
      border: none;
      color: white;
      font-size: 14px;
      cursor: pointer;
      opacity: 0.8;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toast-close:hover {
      opacity: 1;
    }
    .toast-success-banner {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      background: #16a34a;
      color: white;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 10px 15px -3px rgba(22, 163, 74, 0.4);
      cursor: pointer;
      max-width: 380px;
    }
  `]
})
export class AppComponent {
  private readonly apiConfig = inject(ApiConfigService);
  readonly errorMsg = this.apiConfig.httpError;
  readonly successMsg = this.apiConfig.httpSuccess;

  clearError(): void {
    this.apiConfig.httpError.set(null);
  }

  clearSuccess(): void {
    this.apiConfig.httpSuccess.set(null);
  }
}
