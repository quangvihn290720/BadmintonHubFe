import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuditApiService, AuditLogEntry } from '../../core/services/audit-api.service';

@Component({
  selector: 'app-audit',
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditComponent {
  private readonly auditApi = inject(AuditApiService);

  readonly logs = signal<AuditLogEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auditApi.listLogs(50).subscribe({
      next: items => {
        this.logs.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không tải được nhật ký audit.');
        this.loading.set(false);
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return '';
    return new Date(value).toLocaleString('vi-VN');
  }
}
