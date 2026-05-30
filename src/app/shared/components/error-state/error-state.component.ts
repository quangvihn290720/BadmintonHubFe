import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-error-state',
  template: `
    <div class="error-state">
      <span class="error-icon">⚠️</span>
      <h3 class="error-title">{{ title() }}</h3>
      <p class="error-message">{{ message() }}</p>
      @if (showRetry()) {
        <button class="retry-btn" (click)="retry.emit()">Thử lại</button>
      }
    </div>
  `,
  styles: [`
    .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; }
    .error-icon { font-size: 48px; margin-bottom: 16px; }
    .error-title { font-size: 18px; font-weight: 600; color: var(--color-error); margin: 0 0 8px 0; }
    .error-message { font-size: 14px; color: var(--text-secondary); margin: 0 0 16px 0; max-width: 320px; }
    .retry-btn { padding: 8px 20px; background: var(--color-primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
    .retry-btn:hover { background: #1d4ed8; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorStateComponent {
  title = input<string>('Đã xảy ra lỗi');
  message = input<string>('Vui lòng thử lại sau');
  showRetry = input<boolean>(true);
  retry = output<void>();
}
