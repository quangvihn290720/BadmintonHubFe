import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-empty-state',
  imports: [AppIconComponent],
  template: `
    <div class="empty-state">
      <app-icon class="empty-icon" [name]="icon()" [size]="48" />
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
      margin-bottom: 16px;
      opacity: 0.6;
      color: var(--text-secondary);
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
  icon = input<string>('inbox');
  title = input<string>('Không có dữ liệu');
  message = input<string>('Chưa có dữ liệu để hiển thị');
}
