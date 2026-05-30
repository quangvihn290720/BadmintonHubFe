import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  template: `
    <div class="stat-card" [style.--accent-color]="color()">
      <div class="stat-icon-wrapper">
        <span class="stat-icon">{{ icon() }}</span>
      </div>
      <div class="stat-info">
        <span class="stat-label">{{ label() }}</span>
        <span class="stat-value">{{ value() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 14px;
      border: 1px solid var(--border-color);
      transition: all 0.3s ease;
      cursor: default;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    }
    .stat-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--accent-color) 12%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon { font-size: 22px; }
    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .stat-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.5px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
  icon = input<string>('📊');
  label = input<string>('');
  value = input<string>('0');
  color = input<string>('#2563EB');
}
