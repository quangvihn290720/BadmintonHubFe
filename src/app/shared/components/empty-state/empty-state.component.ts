import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <span class="empty-icon">{{ icon() }}</span>
      <h3 class="empty-title">{{ title() }}</h3>
      <p class="empty-message">{{ message() }}</p>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.6;
    }
    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }
    .empty-message {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
      max-width: 320px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  icon = input<string>('📭');
  title = input<string>('Không có dữ liệu');
  message = input<string>('Chưa có dữ liệu để hiển thị');
}
