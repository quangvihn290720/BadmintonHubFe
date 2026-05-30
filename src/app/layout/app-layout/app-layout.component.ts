import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="app-layout" [class.sidebar-collapsed]="sidebarCollapsed()">
      <app-sidebar [collapsed]="sidebarCollapsed()" (toggleCollapse)="sidebarCollapsed.set(!sidebarCollapsed())"></app-sidebar>
      <div class="main-area">
        <app-topbar (toggleSidebar)="sidebarCollapsed.set(!sidebarCollapsed())"></app-topbar>
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
      background: var(--bg-primary);
    }
    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      margin-left: 260px;
      transition: margin-left 0.3s ease;
    }
    .sidebar-collapsed .main-area {
      margin-left: 72px;
    }
    .main-content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }
    @media (max-width: 768px) {
      .main-area {
        margin-left: 0;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLayoutComponent {
  sidebarCollapsed = signal<boolean>(false);
}
