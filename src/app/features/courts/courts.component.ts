import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BackendCourt } from '../../core/models/backend-api.model';
import { CourtApiService } from '../../core/services/court-api.service';
import {
  courtStatusLabel as formatCourtStatusLabel,
  normalizeCourtStatusForApi
} from '../../core/utils/backend-contract.utils';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-courts',
  imports: [AppIconComponent, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './courts.component.html',
  styleUrl: './courts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourtsComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly courtApi = inject(CourtApiService);

  readonly courts = this.courtApi.adminCourts;
  readonly courtsRow1 = computed(() => {
    const list = this.courts();
    const half = Math.ceil(list.length / 2);
    return list.slice(0, half);
  });
  readonly courtsRow2 = computed(() => {
    const list = this.courts();
    const half = Math.ceil(list.length / 2);
    return list.slice(half);
  });
  readonly filteredCourts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.courts();
    return this.courts().filter(court =>
      this.courtCode(court).toLowerCase().includes(query) ||
      this.courtLocation(court).toLowerCase().includes(query) ||
      this.courtStatus(court).toLowerCase().includes(query)
    );
  });
  readonly loading = this.courtApi.loading;
  readonly searchQuery = signal('');
  readonly showModal = signal(false);
  readonly isEdit = signal(false);
  readonly submitted = signal(false);
  readonly selectedCourt = signal<BackendCourt | null>(null);
  readonly error = signal<string | null>(null);
  readonly showConfirmDialog = signal(false);
  readonly confirmDialogTitle = signal('');
  readonly confirmDialogMessage = signal('');
  readonly confirmDialogType = signal<'info' | 'warning' | 'error'>('info');
  readonly confirmDialogActions = signal<Array<{ label: string; type: 'primary' | 'danger' | 'secondary'; handler: () => void }>>([]);

  readonly courtForm = this.fb.group({
    code: ['', [Validators.required]],
    basePricePerHour: [100000, [Validators.required, Validators.min(1)]],
    locationNote: [''],
    status: ['SAN_SONG', [Validators.required]]
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.error.set(null);
    this.courtApi.loadAdminCourts().subscribe({
      error: err => this.error.set(err.error?.message || 'Không tải được danh sách sân.')
    });
  }

  openAddModal(): void {
    this.isEdit.set(false);
    this.selectedCourt.set(null);
    this.submitted.set(false);
    this.courtForm.reset({
      code: '',
      basePricePerHour: 100000,
      locationNote: '',
      status: 'SAN_SONG'
    });
    this.showModal.set(true);
  }

  openEditModal(court: BackendCourt): void {
    this.isEdit.set(true);
    this.selectedCourt.set(court);
    this.submitted.set(false);
    this.courtForm.setValue({
      code: this.courtCode(court),
      basePricePerHour: this.courtBasePrice(court),
      locationNote: this.courtLocation(court),
      status: this.courtStatus(court)
    });
    this.showModal.set(true);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.error.set(null);
    if (this.courtForm.invalid) return;

    const data = this.courtForm.getRawValue();
    const request = {
      code: data.code.trim(),
      basePricePerHour: Number(data.basePricePerHour),
      locationNote: data.locationNote.trim(),
      status: normalizeCourtStatusForApi(data.status)
    };
    const existing = this.selectedCourt();
    const request$ = this.isEdit() && existing
      ? this.courtApi.updateCourt({ ...existing, ...request })
      : this.courtApi.createCourt(request);

    request$.subscribe({
      next: () => {
        this.showModal.set(false);
        this.reload();
      },
      error: err => this.error.set(err.error?.message || 'Không lưu được sân.')
    });
  }

  changeStatus(court: BackendCourt, status: string): void {
    const nextStatus = normalizeCourtStatusForApi(status);
    this.confirmDialogTitle.set('Xác nhận đổi trạng thái');
    this.confirmDialogMessage.set(
      `Bạn có chắc muốn đổi trạng thái của sân ${this.courtCode(court)} sang "${formatCourtStatusLabel(nextStatus)}"?`
    );
    this.confirmDialogType.set(nextStatus === 'BAO_TRI_LUOI' ? 'warning' : 'info');
    this.confirmDialogActions.set([
      {
        label: 'Xác nhận',
        type: nextStatus === 'BAO_TRI_LUOI' ? 'danger' : 'primary',
        handler: () => {
          this.showConfirmDialog.set(false);
          this.executeChangeStatus(court, nextStatus);
        }
      }
    ]);
    this.showConfirmDialog.set(true);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  showError(field: 'code' | 'basePricePerHour' | 'status'): boolean {
    return this.submitted() && this.courtForm.controls[field].invalid;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  courtCode(court: BackendCourt): string {
    return court.code || court.kyHieuSoSan || '';
  }

  courtBasePrice(court: BackendCourt): number {
    return Number(court.basePricePerHour ?? court.giaCoBanTheoGio ?? 0);
  }

  courtLocation(court: BackendCourt): string {
    return court.locationNote || court.viTriText || '';
  }

  courtStatus(court: BackendCourt): string {
    return normalizeCourtStatusForApi(court.status || court.trangThaiVanHanh);
  }

  courtStatusLabel(court: BackendCourt): string {
    return formatCourtStatusLabel(this.courtStatus(court));
  }

  private executeChangeStatus(court: BackendCourt, status: string): void {
    this.error.set(null);
    this.courtApi.updateCourtStatus(court.id, status).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(err.error?.message || 'Không cập nhật được trạng thái sân.')
    });
  }
}
