import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { MockCustomerService } from '../../core/services/mock-customer.service';
import { MockBookingService } from '../../core/services/mock-booking.service';
import { PricingService } from '../../core/services/pricing.service';
import { Customer, Booking } from '../../core/models';

@Component({
  selector: 'app-customers',
  imports: [StatusBadgeComponent],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomersComponent {
  private readonly customerService = inject(MockCustomerService);
  private readonly bookingService = inject(MockBookingService);
  private readonly pricingService = inject(PricingService);

  readonly allCustomers = this.customerService.customers;
  readonly blacklistCustomers = this.customerService.blacklistedCustomers;

  readonly activeTab = signal<'all' | 'blacklist'>('all');
  readonly searchQuery = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);

  readonly displayedCustomers = computed(() => {
    return this.activeTab() === 'blacklist' ? this.blacklistCustomers() : this.allCustomers();
  });

  readonly filteredCustomers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.activeTab();
    const baseList = tab === 'blacklist' ? this.blacklistCustomers() : this.allCustomers();

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

  readonly customerBookings = computed<Booking[]>(() => {
    const cust = this.selectedCustomer();
    if (!cust) return [];
    return this.bookingService.bookings()
      .filter(b => b.customerPhone === cust.phone)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  });

  readonly customerTotalSpent = computed<number>(() => {
    return this.customerBookings().reduce((sum, b) => {
      if (b.status === 'cancelled') return sum;
      return sum + b.totalAmount;
    }, 0);
  });

  openDetailsModal(customer: Customer): void {
    this.selectedCustomer.set(customer);
    this.showDetailsModal.set(true);
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

  // Masking functions for security
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

  onTabChange(tab: 'all' | 'blacklist'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.searchQuery.set('');
  }
}

