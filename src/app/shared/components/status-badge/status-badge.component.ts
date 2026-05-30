import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="badge"
          [class.badge-available]="status() === 'available'"
          [class.badge-deposited]="status() === 'deposited'"
          [class.badge-playing]="status() === 'playing'"
          [class.badge-cancelled]="status() === 'cancelled'"
          [class.badge-completed]="status() === 'completed'"
          [class.badge-paid]="status() === 'paid'"
          [class.badge-pending]="status() === 'pending'"
          [class.badge-partial]="status() === 'partial'">
      {{ label() }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .badge-available { background: rgba(22, 163, 74, 0.1); color: var(--color-success); }
    .badge-deposited { background: rgba(37, 99, 235, 0.1); color: var(--color-primary); }
    .badge-playing { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
    .badge-cancelled { background: rgba(220, 38, 38, 0.1); color: var(--color-error); }
    .badge-completed { background: rgba(100, 116, 139, 0.1); color: #64748b; }
    .badge-paid { background: rgba(22, 163, 74, 0.1); color: var(--color-success); }
    .badge-pending { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
    .badge-partial { background: rgba(37, 99, 235, 0.1); color: var(--color-primary); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  status = input<string>('available');
  label = input<string>('');
}
