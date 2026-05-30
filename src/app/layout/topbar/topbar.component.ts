import { Component, EventEmitter, OnInit, OnDestroy, inject, output, ChangeDetectionStrategy, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ApiConfigService } from '../../core/services/api-config.service';

@Component({
  selector: 'app-topbar',
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <button class="menu-toggle" (click)="toggleSidebar.emit()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1 class="page-title">BadmintonHub</h1>
        <div class="clock-display">🕒 {{ currentTime() }}</div>
      </div>
      <div class="topbar-right">
        <!-- API Mode Switcher Badge Toggle -->
        <div class="api-switcher" (click)="toggleApiMode()" title="Bấm để chuyển đổi Offline Giả lập / Online API Backend">
          <span class="switcher-badge" [class.online]="!isMockMode()">
            {{ isMockMode() ? '🧪 Offline Giả lập' : '🌐 Online API :4201' }}
          </span>
        </div>

        <div class="staff-info">
          <div class="staff-avatar">{{ staffInitial }}</div>
          <div class="staff-details">
            <span class="staff-name">{{ staffName }}</span>
            <span class="staff-role">Nhân viên</span>
          </div>
        </div>
        <button class="logout-btn" (click)="logout()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span class="logout-text">Đăng xuất</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      height: 64px; padding: 0 24px; background: white;
      border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 50;
    }
    .topbar-left { display: flex; align-items: center; gap: 16px; }
    .menu-toggle {
      display: flex; background: none; border: none; color: var(--text-secondary);
      cursor: pointer; padding: 4px; border-radius: 6px;
    }
    .menu-toggle:hover { background: var(--bg-secondary); }
    .page-title { font-size: 20px; font-weight: 700; color: var(--color-dark); letter-spacing: -0.5px; }
    .clock-display {
      font-size: 14px; font-weight: 700; color: var(--color-primary);
      background: rgba(37, 99, 235, 0.08); padding: 4px 10px; border-radius: 6px;
      font-family: 'Courier New', Courier, monospace; letter-spacing: 0.5px;
    }
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    .api-switcher {
      cursor: pointer; display: flex; align-items: center;
      transition: all 0.2s;
    }
    .switcher-badge {
      font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 20px;
      background: #f1f5f9; color: #475569; border: 1.5px solid #cbd5e1;
      display: inline-flex; align-items: center; gap: 4px;
      transition: all 0.2s; user-select: none;
    }
    .switcher-badge:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .switcher-badge.online {
      background: #2563eb14; color: #2563eb; border-color: #2563eb3b;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
    }
    .staff-info {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 12px; background: var(--bg-secondary); border-radius: 10px;
    }
    .staff-avatar {
      width: 32px; height: 32px; background: var(--color-primary); color: white;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px;
    }
    .staff-details { display: flex; flex-direction: column; }
    .staff-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .staff-role { font-size: 11px; color: var(--text-secondary); }
    .logout-btn {
      display: flex; align-items: center; gap: 6px; padding: 8px 14px;
      background: none; border: 1px solid var(--border-color); border-radius: 8px;
      color: var(--text-secondary); cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s;
    }
    .logout-btn:hover { background: var(--color-error); color: white; border-color: var(--color-error); }
    @media (max-width: 900px) {
      .api-switcher { display: none; }
    }
    @media (max-width: 768px) {
      .staff-details { display: none; }
      .logout-text { display: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly apiConfig = inject(ApiConfigService);
  
  toggleSidebar = output<void>();
  staffName: string;
  staffInitial: string;
  currentTime = signal<string>('');
  private timerId: any;

  readonly isMockMode = this.apiConfig.isMockMode;

  constructor() {
    this.staffName = this.authService.getStaffName();
    this.staffInitial = this.staffName.charAt(0).toUpperCase();
  }

  ngOnInit(): void {
    this.updateClock();
    this.timerId = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }

  private updateClock(): void {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const secs = now.getSeconds().toString().padStart(2, '0');
    this.currentTime.set(`${hours}:${mins}:${secs}`);
  }

  toggleApiMode(): void {
    this.apiConfig.toggleMockMode();
  }

  logout(): void {
    this.authService.logout();
  }
}
