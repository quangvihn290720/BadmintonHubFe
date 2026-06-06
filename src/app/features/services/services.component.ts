import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AdditionalServiceService, ServiceItem } from '../../core/services/additional-service.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-services',
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServicesComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly additionalService = inject(AdditionalServiceService);
  private readonly authService = inject(AuthService);

  readonly services = this.additionalService.services;
  readonly isAdmin = computed(() => this.authService.currentUser()?.role === 'admin');

  // Confirmation Dialog Signals
  readonly showConfirmDialog = signal<boolean>(false);
  readonly confirmDialogTitle = signal<string>('');
  readonly confirmDialogMessage = signal<string>('');
  readonly confirmDialogActions = signal<Array<{ label: string; type: 'primary' | 'danger' | 'secondary'; handler: () => void }>>([]);

  // Search Signal
  readonly searchQuery = signal<string>('');
  readonly showModal = signal<boolean>(false);
  readonly isEdit = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);
  readonly selectedServiceId = signal<number | null>(null);

  readonly serviceForm = this.fb.group({
    name: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]]
  });

  readonly filteredServices = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.services();

    if (!query) return list;

    return list.filter(s => s.name.toLowerCase().includes(query));
  });

  showError(field: 'name' | 'price'): boolean {
    let c;
    switch (field) {
      case 'name':
        c = this.serviceForm.controls.name;
        break;
      case 'price':
        c = this.serviceForm.controls.price;
        break;
    }
    return !!(this.submitted() && c && c.invalid);
  }

  openAddModal(): void {
    this.isEdit.set(false);
    this.selectedServiceId.set(null);
    this.submitted.set(false);
    this.serviceForm.reset();
    this.showModal.set(true);
  }

  openEditModal(item: ServiceItem): void {
    this.isEdit.set(true);
    this.selectedServiceId.set(item.id);
    this.submitted.set(false);
    this.serviceForm.setValue({
      name: item.name,
      price: item.price
    });
    this.showModal.set(true);
  }

  deleteService(id: number): void {
    const item = this.services().find(s => s.id === id);
    const name = item ? item.name : '';

    this.confirmDialogTitle.set('Xác nhận xóa');
    this.confirmDialogMessage.set(`Bạn có chắc chắn muốn xóa dịch vụ "${name}"? Hành động này không thể hoàn tác.`);
    this.confirmDialogActions.set([
      {
        label: 'Xác nhận xóa',
        type: 'danger',
        handler: () => {
          this.showConfirmDialog.set(false);
          this.additionalService.deleteService(id);
        }
      }
    ]);
    this.showConfirmDialog.set(true);
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (this.serviceForm.invalid) return;

    const data = this.serviceForm.getRawValue();
    if (this.isEdit()) {
      this.additionalService.updateService(this.selectedServiceId()!, data.name, data.price);
    } else {
      this.additionalService.addService(data.name, data.price);
    }
    this.showModal.set(false);
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
}
