import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  readonly searchQuery = signal('');
  readonly entityFilter = signal('all');

  readonly entityTypes = computed(() => {
    const types = new Set(this.logs().map(log => log.entityType).filter(Boolean));
    return [...types].sort();
  });

  readonly filteredLogs = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const entity = this.entityFilter();
    return this.logs().filter(log => {
      const matchesEntity = entity === 'all' || log.entityType === entity;
      if (!matchesEntity) return false;
      if (!q) return true;
      const haystack = [log.action, log.entityType, log.entityId, log.newValue].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly latestLogTime = computed(() => {
    const first = this.logs()[0];
    if (!first?.createdAt) return '';
    return new Date(first.createdAt).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  });

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

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onEntityFilterChange(event: Event): void {
    this.entityFilter.set((event.target as HTMLSelectElement).value);
  }

  formatDate(value: string): string {
    if (!value) return '';
    return new Date(value).toLocaleString('vi-VN');
  }

  formatAction(action: string): string {
    return action.replace(/_/g, ' ');
  }

  actionBadgeClass(action: string): string {
    const upper = action.toUpperCase();
    if (upper.includes('CREATE') || upper.includes('INSERT')) return 'action-create';
    if (upper.includes('DELETE') || upper.includes('REMOVE')) return 'action-delete';
    if (upper.includes('STATUS') || upper.includes('ACTIVATE') || upper.includes('BLACKLIST')) return 'action-status';
    if (upper.includes('UPDATE') || upper.includes('PATCH') || upper.includes('EDIT')) return 'action-update';
    return 'action-default';
  }

  shortId(id: string): string {
    if (!id || id.length <= 12) return id || '—';
    return `${id.slice(0, 8)}…`;
  }
}
