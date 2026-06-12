import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CustomerService } from '../../core/services/customer.service';
import { BookingService } from '../../core/services/booking.service';
import { PricingService } from '../../core/services/pricing.service';
import { Customer, Booking, getVipTier } from '../../core/models';

type CustomerActionType = 'blacklist' | 'activate';

@Component({
  selector: 'app-customers',
  imports: [AppIconComponent, StatusBadgeComponent, FormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomersComponent {
  private readonly customerService = inject(CustomerService);
  private readonly bookingService = inject(BookingService);
  private readonly pricingService = inject(PricingService);

  readonly allCustomers = this.customerService.customers;
  readonly regularCustomers = computed(() => this.allCustomers().filter(c => !c.isBlacklisted));
  readonly blacklistCustomers = this.customerService.blacklistedCustomers;

  readonly activeTab = signal<'regular' | 'blacklist'>('regular');
  readonly searchQuery = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);

  readonly displayedCustomers = computed(() => {
    return this.activeTab() === 'blacklist' ? this.blacklistCustomers() : this.regularCustomers();
  });

  readonly filteredCustomers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.activeTab();
    const baseList = tab === 'blacklist' ? this.blacklistCustomers() : this.regularCustomers();

    if (!query) return baseList;

    return baseList.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query)
    );
  });

  readonly totalPages = computed(() => {
    const count = this.filteredCustomers().length;
    return Math.max(1, Math.ceil(count / this.pageSize()));
  });

  readonly paginatedCustomers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCustomers().slice(start, start + this.pageSize());
  });

  readonly selectedCustomer = signal<Customer | null>(null);
  readonly showDetailsModal = signal<boolean>(false);
  readonly actionMessage = signal<string>('');
  readonly customerBookings = signal<Booking[]>([]);
  readonly loadingBookings = signal<boolean>(false);

  readonly pendingAction = signal<CustomerActionType | null>(null);
  readonly actionReason = signal<string>('');
  readonly actionReasonError = signal<string>('');
  readonly actionSubmitting = signal<boolean>(false);

  readonly customerTotalSpent = computed<number>(() => {
    return this.customerBookings().reduce((sum, b) => {
      if (b.status === 'cancelled') return sum;
      return sum + b.totalAmount;
    }, 0);
  });

  openDetailsModal(customer: Customer): void {
    this.pendingAction.set(null);
    this.actionReason.set('');
    this.actionReasonError.set('');
    this.selectedCustomer.set(customer);
    this.actionMessage.set('');
    this.customerBookings.set([]);
    this.showDetailsModal.set(true);
    this.loadCustomerBookings(customer);
    if (customer.backendId) {
      this.customerService.fetchVipPoints(customer.backendId).subscribe(points => {
        this.selectedCustomer.update(c => c ? { ...c, points } : c);
      });
    }
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.pendingAction.set(null);
    this.actionReason.set('');
    this.actionReasonError.set('');
  }

  onModalOverlayClick(): void {
    if (this.pendingAction()) {
      this.cancelActionConfirm();
      return;
    }
    this.closeDetailsModal();
  }

  private loadCustomerBookings(customer: Customer): void {
    if (!customer.backendId) return;
    this.loadingBookings.set(true);
    this.bookingService.fetchBookingsByCustomer(customer.backendId).subscribe({
      next: bookings => {
        this.customerBookings.set(
          [...bookings].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
        );
        this.loadingBookings.set(false);
      },
      error: () => this.loadingBookings.set(false)
    });
  }

  openBlacklistConfirm(): void {
    this.pendingAction.set('blacklist');
    this.actionReason.set('');
    this.actionReasonError.set('');
  }

  openActivateConfirm(): void {
    this.pendingAction.set('activate');
    this.actionReason.set('');
    this.actionReasonError.set('');
  }

  cancelActionConfirm(): void {
    if (this.actionSubmitting()) return;
    this.pendingAction.set(null);
    this.actionReason.set('');
    this.actionReasonError.set('');
  }

  confirmAction(): void {
    const action = this.pendingAction();
    const cust = this.selectedCustomer();
    if (!action || !cust?.backendId) return;

    const reason = this.actionReason().trim();
    if (action === 'blacklist' && !reason) {
      this.actionReasonError.set('Vui lòng nhập lý do blacklist.');
      return;
    }

    this.actionSubmitting.set(true);
    this.actionReasonError.set('');

    const request$ = action === 'blacklist'
      ? this.customerService.blacklistCustomer(cust.backendId, reason)
      : this.customerService.activateCustomer(cust.backendId);

    request$.subscribe({
      next: updated => {
        this.actionSubmitting.set(false);
        if (!updated) {
          this.actionReasonError.set(action === 'blacklist'
            ? 'Không thể blacklist khách hàng.'
            : 'Không thể kích hoạt khách hàng.');
          return;
        }
        this.selectedCustomer.set(updated);
        this.pendingAction.set(null);
        this.actionReason.set('');
        this.actionMessage.set(
          action === 'blacklist'
            ? 'Đã đưa khách vào blacklist.'
            : reason
              ? `Đã kích hoạt lại khách hàng. Ghi chú: ${reason}`
              : 'Đã kích hoạt lại khách hàng.'
        );
        this.loadCustomerBookings(updated);
      },
      error: () => {
        this.actionSubmitting.set(false);
        this.actionReasonError.set(action === 'blacklist'
          ? 'Không thể blacklist khách hàng.'
          : 'Không thể kích hoạt khách hàng.');
      }
    });
  }

  getVipTier(points?: number): string {
    return getVipTier(points);
  }

  formatCurrency(amount: number): string {
    return this.pricingService.formatCurrency(amount);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  getBookingStatusLabel(status: string): string {
    switch (status) {
      case 'available': return 'Trống';
      case 'deposited': return 'Đã cọc';
      case 'playing': return 'Đang chơi';
      case 'cancelled': return 'Đã hủy';
      case 'completed': return 'Hoàn thành';
      default: return status;
    }
  }

  maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 3);
  }

  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `*@${domain}`;
    return local.substring(0, 2) + '***' + '@' + domain;
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onPageSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(val);
    this.currentPage.set(1);
  }

  onTabChange(tab: 'regular' | 'blacklist'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.searchQuery.set('');
  }
}
