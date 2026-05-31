import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AdditionalServiceService, ServiceItem } from '../../core/services/additional-service.service';

@Component({
  selector: 'app-services',
  imports: [ReactiveFormsModule],
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
    if (confirm('Xác nhận xóa dịch vụ phụ trợ này?')) {
      this.additionalService.deleteService(id);
    }
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
