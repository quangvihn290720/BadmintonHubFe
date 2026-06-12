import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-error-state',
  imports: [AppIconComponent],
  template: `
    <div class="error-state">
      <app-icon class="error-icon" name="warning" [size]="48" />
      <h3 class="error-title">{{ title() }}</h3>
      <p class="error-message">{{ message() }}</p>
      @if (showRetry()) {
        <button class="retry-btn" (click)="retry.emit()">Thử lại</button>
      }
    </div>
  `,
  styles: [`
    .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; }
    .error-icon { margin-bottom: 16px; color: var(--color-error); }
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
