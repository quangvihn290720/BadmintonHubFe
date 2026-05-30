import { Component, input, output, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <div class="sidebar-header">
        <div class="logo-area">
          <div class="logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="11" r="4" fill="white"/>
              <path d="M10 26 C10 20, 22 20, 22 26" stroke="white" stroke-width="2" fill="none"/>
              <line x1="20" y1="8" x2="26" y2="2" stroke="white" stroke-width="2" stroke-linecap="round"/>
              <circle cx="27" cy="1" r="1" fill="white"/>
            </svg>
          </div>
          @if (!collapsed()) {
            <span class="logo-text">BadmintonHub</span>
          }
        </div>
      </div>

      <nav class="sidebar-nav">
        @for (section of navSections(); track section.title) {
          @if (!collapsed() && section.items.length > 0) {
            <div class="nav-section-title">{{ section.title }}</div>
          }
          @for (item of section.items; track item.route) {
            <a class="nav-item"
               [routerLink]="item.route"
               routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }">
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              @if (!collapsed()) {
                <span class="nav-label">{{ item.label }}</span>
              }
            </a>
          }
        }
      </nav>

      @if (!collapsed()) {
        <div class="sidebar-footer">
          <div class="version-info">v1.0.0 · BadmintonHub</div>
        </div>
      }
    </aside>
  `,
  styles: [`
    .sidebar {
      position: fixed; top: 0; left: 0; bottom: 0; width: 260px;
      background: var(--color-dark); color: white;
      display: flex; flex-direction: column;
      transition: width 0.3s ease; z-index: 100; overflow: hidden;
    }
    .sidebar.collapsed { width: 72px; }
    .sidebar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .logo-area { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .logo-icon {
      flex-shrink: 0; width: 40px; height: 40px;
      background: var(--color-primary); border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-text { font-size: 18px; font-weight: 700; white-space: nowrap; letter-spacing: -0.3px; }
    .collapse-btn {
      background: none; border: none; color: rgba(255,255,255,0.5);
      cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.2s; flex-shrink: 0;
    }
    .collapse-btn:hover { color: white; background: rgba(255,255,255,0.1); }
    .sidebar-nav {
      flex: 1; padding: 12px 8px;
      display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
    }
    .nav-section-title {
      font-size: 10px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.4);
      padding: 16px 12px 6px 12px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .nav-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px;
      border-radius: 8px; color: rgba(255,255,255,0.65);
      text-decoration: none; font-size: 14px; font-weight: 500;
      transition: all 0.2s; white-space: nowrap;
    }
    .nav-item:hover { color: white; background: rgba(255,255,255,0.08); }
    .nav-item.active {
      color: white; background: var(--color-primary);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
    }
    .nav-icon {
      flex-shrink: 0; width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    .nav-label { min-width: 0; }
    .sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.08); }
    .version-info { font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; }
    .sidebar.collapsed .sidebar-header { justify-content: center; padding: 20px 8px; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 10px; }
    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar:not(.collapsed) { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.3); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  collapsed = input<boolean>(false);
  toggleCollapse = output<void>();

  private readonly authService = inject(AuthService);

  readonly navSections = computed<NavSection[]>(() => {
    const isAdmin = this.authService.currentUser()?.role === 'admin';
    const sections: NavSection[] = [
      {
        title: 'VẬN HÀNH',
        items: [
          { label: 'Lịch sân & Lưới giờ', route: '/dashboard', icon: '📅' },
          { label: 'Đặt sân mới', route: '/booking/new', icon: '🏸' }
        ]
      },
      {
        title: 'KINH DOANH & KHÁCH HÀNG',
        items: [
          { label: 'Thanh toán & Giao dịch', route: '/payment', icon: '💳' },
          { label: 'Quản lý khách hàng', route: '/customers', icon: '👥' },
          { label: 'Cấu hình bảng giá', route: '/pricing', icon: '💰' }
        ]
      },
      {
        title: 'HỆ THỐNG',
        items: [
          { label: 'Báo cáo & Thống kê', route: '/reports', icon: '📈' }
        ]
      }
    ];

    if (isAdmin) {
      sections[2].items.push({ label: 'Tài khoản nhân viên', route: '/staff', icon: '🔑' });
    }

    return sections;
  });
}
