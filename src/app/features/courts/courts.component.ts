import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BackendCourt } from '../../core/models/backend-api.model';
import { CourtApiService } from '../../core/services/court-api.service';

@Component({
  selector: 'app-courts',
  imports: [ReactiveFormsModule],
  templateUrl: './courts.component.html',
  styleUrl: './courts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourtsComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly courtApi = inject(CourtApiService);

  readonly courts = this.courtApi.adminCourts;
  readonly loading = this.courtApi.loading;
  readonly searchQuery = signal<string>('');
  readonly showModal = signal<boolean>(false);
  readonly isEdit = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);
  readonly selectedCourt = signal<BackendCourt | null>(null);
  readonly error = signal<string | null>(null);

  readonly courtForm = this.fb.group({
    code: ['', [Validators.required]],
    basePricePerHour: [100000, [Validators.required, Validators.min(1)]],
    locationNote: [''],
    status: ['AVAILABLE', [Validators.required]]
  });

  readonly filteredCourts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.courts();
    return this.courts().filter(court =>
      court.code.toLowerCase().includes(query) ||
      (court.locationNote || '').toLowerCase().includes(query) ||
      court.status.toLowerCase().includes(query)
    );
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.error.set(null);
    this.courtApi.loadAdminCourts().subscribe({
      error: err => this.error.set(err.error?.message || 'Khong tai duoc danh sach san.')
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
      status: 'AVAILABLE'
    });
    this.showModal.set(true);
  }

  openEditModal(court: BackendCourt): void {
    this.isEdit.set(true);
    this.selectedCourt.set(court);
    this.submitted.set(false);
    this.courtForm.setValue({
      code: court.code,
      basePricePerHour: Number(court.basePricePerHour),
      locationNote: court.locationNote || '',
      status: court.status
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
      status: data.status
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
      error: err => this.error.set(err.error?.message || 'Khong luu duoc san.')
    });
  }

  changeStatus(court: BackendCourt, status: string): void {
    this.error.set(null);
    this.courtApi.updateCourtStatus(court.id, status).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(err.error?.message || 'Khong cap nhat duoc trang thai san.')
    });
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
}
