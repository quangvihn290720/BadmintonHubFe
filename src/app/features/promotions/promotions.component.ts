import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PromotionApiService, PromotionFormData } from '../../core/services/promotion-api.service';
import { BackendPromotion } from '../../core/models/backend-api.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-promotions',
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromotionsComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly promotionApi = inject(PromotionApiService);

  readonly promotions = this.promotionApi.adminPromotions;
  readonly searchQuery = signal('');
  readonly statusFilter = signal<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  readonly showModal = signal(false);
  readonly isEdit = signal(false);
  readonly submitted = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly showConfirmDialog = signal(false);
  readonly confirmDialogTitle = signal('');
  readonly confirmDialogMessage = signal('');
  readonly confirmDialogActions = signal<Array<{ label: string; type: 'primary' | 'danger' | 'secondary'; handler: () => void }>>([]);

  readonly filteredPromotions = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    return this.promotions().filter(p => {
      const matchesSearch = !q || this.promotionApi.promotionCode(p).toLowerCase().includes(q);
      const itemStatus = p.trangThai || p.status || 'ACTIVE';
      const matchesStatus = status === 'all' || itemStatus === status;
      return matchesSearch && matchesStatus;
    });
  });

  readonly promotionForm = this.fb.group({
    code: ['', [Validators.required]],
    loaiGiamGia: ['FIXED_AMOUNT' as 'PERCENT' | 'FIXED_AMOUNT', [Validators.required]],
    discountValue: [10000, [Validators.required, Validators.min(1)]],
    remainingQuantity: [10, [Validators.required, Validators.min(0)]],
    expiredAt: ['', [Validators.required]],
    status: ['ACTIVE', [Validators.required]]
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.error.set(null);
    this.promotionApi.loadAdminPromotions().subscribe({
      error: () => this.error.set('Không tải được danh sách khuyến mãi.')
    });
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'all' | 'ACTIVE' | 'INACTIVE');
  }

  showError(field: 'code' | 'discountValue' | 'expiredAt'): boolean {
    const control = this.promotionForm.controls[field];
    return this.submitted() && control.invalid;
  }

  openAddModal(): void {
    this.isEdit.set(false);
    this.selectedId.set(null);
    this.submitted.set(false);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.promotionForm.reset({
      code: '',
      loaiGiamGia: 'FIXED_AMOUNT',
      discountValue: 10000,
      remainingQuantity: 10,
      expiredAt: nextMonth.toISOString().slice(0, 16),
      status: 'ACTIVE'
    });
    this.showModal.set(true);
  }

  openEditModal(item: BackendPromotion): void {
    this.isEdit.set(true);
    this.selectedId.set(item.id);
    this.submitted.set(false);
    const expired = item.hanSuDung || item.expiredAt || '';
    this.promotionForm.setValue({
      code: this.promotionApi.promotionCode(item),
      loaiGiamGia: (item.loaiGiamGia === 'PERCENT' ? 'PERCENT' : 'FIXED_AMOUNT'),
      discountValue: item.giaTriGiam ?? item.discountValue ?? 0,
      remainingQuantity: item.soLuongConLai ?? item.remainingQuantity ?? 0,
      expiredAt: expired.length >= 16 ? expired.slice(0, 16) : expired,
      status: item.trangThai || item.status || 'ACTIVE'
    });
    this.showModal.set(true);
  }

  toggleStatus(item: BackendPromotion): void {
    const current = item.trangThai || item.status || 'ACTIVE';
    const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.promotionApi.updateStatus(item.id, next).subscribe({
      error: () => this.error.set('Không thể đổi trạng thái khuyến mãi.')
    });
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (this.promotionForm.invalid) return;

    const raw = this.promotionForm.getRawValue();
    const payload: PromotionFormData = {
      ...raw,
      expiredAt: raw.expiredAt.includes('T') ? `${raw.expiredAt}:00` : raw.expiredAt
    };

    const request$ = this.isEdit()
      ? this.promotionApi.updatePromotion(this.selectedId()!, payload)
      : this.promotionApi.createPromotion(payload);

    request$.subscribe({
      next: () => {
        this.showModal.set(false);
        this.reload();
      },
      error: () => this.error.set('Lưu khuyến mãi thất bại.')
    });
  }

  codeOf(item: BackendPromotion): string {
    return this.promotionApi.promotionCode(item);
  }

  discountOf(item: BackendPromotion): string {
    return this.promotionApi.discountLabel(item);
  }

  isPercent(item: BackendPromotion): boolean {
    return (item.loaiGiamGia || '') === 'PERCENT';
  }

  isActive(item: BackendPromotion): boolean {
    return (item.trangThai || item.status || 'ACTIVE') === 'ACTIVE';
  }

  remainingOf(item: BackendPromotion): number {
    return item.soLuongConLai ?? item.remainingQuantity ?? 0;
  }

  formatExpiry(item: BackendPromotion): string {
    const raw = item.hanSuDung || item.expiredAt || '';
    if (!raw) return '—';
    return new Date(raw).toLocaleDateString('vi-VN');
  }

  isExpired(item: BackendPromotion): boolean {
    const raw = item.hanSuDung || item.expiredAt || '';
    if (!raw) return false;
    return new Date(raw).getTime() < Date.now();
  }
}
