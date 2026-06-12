import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppIconComponent } from '../app-icon/app-icon.component';
import { dialogIconName } from '../app-icon/dialog-icon.util';

@Component({
  selector: 'app-confirm-dialog',
  imports: [AppIconComponent],
  template: `
    @if (visible()) {
      <div class="dialog-overlay" (click)="onOverlayClick($event)">
        <div class="dialog"
             [class.dialog-info]="type() === 'info'"
             [class.dialog-warning]="type() === 'warning'"
             [class.dialog-error]="type() === 'error'">
          <div class="dialog-header">
            <app-icon class="dialog-icon" [name]="dialogIconName(type())" [size]="28" />
            <h3 class="dialog-title">{{ title() }}</h3>
          </div>
          <div class="dialog-body">
            <p>{{ message() }}</p>
            @if (detail()) {
              <p class="dialog-detail">{{ detail() }}</p>
            }
          </div>
          <div class="dialog-actions">
            @for (action of actions(); track action.label) {
              <button class="dialog-btn"
                [class.btn-primary]="action.type === 'primary'"
                [class.btn-danger]="action.type === 'danger'"
                [class.btn-secondary]="action.type === 'secondary'"
                (click)="action.handler()">
                {{ action.label }}
              </button>
            }
            @if (showCancel()) {
              <button class="dialog-btn btn-secondary" (click)="cancel.emit()">Đóng</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; animation: fadeIn 0.2s ease;
    }
    .dialog {
      background: white; border-radius: 16px; padding: 28px;
      max-width: 480px; width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15); animation: slideUp 0.3s ease;
    }
    .dialog-info { border-top: 4px solid var(--color-primary); }
    .dialog-warning { border-top: 4px solid var(--color-warning); }
    .dialog-error { border-top: 4px solid var(--color-error); }
    .dialog-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .dialog-icon { color: var(--text-primary); }
    .dialog-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .dialog-body p { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0 0 8px 0; }
    .dialog-detail { background: var(--bg-secondary); padding: 12px; border-radius: 8px; font-size: 13px !important; color: var(--text-primary) !important; border-left: 3px solid var(--color-warning); }
    .dialog-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; flex-wrap: wrap; }
    .dialog-btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-primary { background: var(--color-primary); color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-danger { background: var(--color-error); color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-secondary { background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border-color); }
    .btn-secondary:hover { background: #e2e8f0; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  readonly dialogIconName = dialogIconName;

  visible = input<boolean>(false);
  title = input<string>('');
  message = input<string>('');
  detail = input<string>('');
  type = input<'info' | 'warning' | 'error'>('info');
  showCancel = input<boolean>(true);
  actions = input<Array<{ label: string; type: 'primary' | 'danger' | 'secondary'; handler: () => void }>>([]);
  cancel = output<void>();

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-overlay')) {
      this.cancel.emit();
    }
  }
}
