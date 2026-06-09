import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit } from '@angular/core';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { BookingService } from '../../core/services/booking.service';
import { CustomerService } from '../../core/services/customer.service';
import { ThanhToanApiService, ThanhToanSummary } from '../../core/services/thanhtoan-api.service';
import { ApiConfigService } from '../../core/services/api-config.service';
import { BookingStatus, Booking, PaymentMethod } from '../../core/models';

@Component({
  selector: 'app-payment',
  imports: [StatusBadgeComponent],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly customerService = inject(CustomerService);
  private readonly thanhtoanApi = inject(ThanhToanApiService);
  private readonly apiConfig = inject(ApiConfigService);

  readonly thanhtoans = signal<ThanhToanSummary[]>([]);
  readonly selectedDate = signal(new Date().toISOString().split('T')[0]);
  readonly lichdatTransactions = signal<ThanhToanSummary[]>([]);

  ngOnInit(): void {
    this.reloadThanhToans();
    this.bookingService.fetchBookings(this.selectedDate());
  }

  reloadThanhToans(): void {
    this.thanhtoanApi.listByDate(this.selectedDate()).subscribe(items => this.thanhtoans.set(items));
  }

  readonly payments = computed(() => {
    const bookings = this.bookingService.bookings().filter(b => b.status !== BookingStatus.Cancelled);
    return bookings.map(b => {
      let status: 'paid' | 'pending' | 'partial' = 'pending';
      if (b.status === BookingStatus.Completed) {
        status = 'paid';
      } else if (b.deposit > 0) {
        status = 'partial';
      }
      
      let pmLabel = 'Tiền mặt';
      if (b.paymentMethod === 'bank_transfer') pmLabel = 'Chuyển khoản';
      if (b.paymentMethod === 'momo_qr') pmLabel = 'MOMO / QR';

      const srvAmt = b.additionalServices?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
      const otAmt = b.overtimeAmount || 0;
      const totalAmount = b.totalAmount + srvAmt + otAmt;

      return {
        id: b.id,
        bookingCode: b.code,
        customerName: b.customerName,
        courtName: b.courtName,
        date: b.date,
        totalAmount: totalAmount,
        deposit: b.deposit,
        remaining: b.status === BookingStatus.Completed ? 0 : totalAmount - b.deposit,
        status: status,
        paymentMethod: pmLabel
      };
    });
  });

  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'all' | 'paid' | 'pending' | 'partial'>('all');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);
  readonly selectedPaymentId = signal<number | null>(null);
  readonly showDetailModal = signal<boolean>(false);
  readonly checkoutPaymentMethod = signal<PaymentMethod>(PaymentMethod.Cash);

  readonly filteredPayments = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const baseList = this.payments();

    let list = baseList;
    if (status !== 'all') {
      list = baseList.filter(p => p.status === status);
    }

    if (!query) return list;

    return list.filter(p =>
      p.bookingCode.toLowerCase().includes(query) ||
      p.customerName.toLowerCase().includes(query) ||
      p.courtName.toLowerCase().includes(query) ||
      p.paymentMethod.toLowerCase().includes(query)
    );
  });

  readonly totalPages = computed(() => {
    const count = this.filteredPayments().length;
    return Math.max(1, Math.ceil(count / this.pageSize()));
  });

  readonly paginatedPayments = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPayments().slice(start, start + this.pageSize());
  });

  readonly activeBooking = computed(() => {
    const id = this.selectedPaymentId();
    if (!id) return null;
    return this.bookingService.getAllBookings().find(b => b.id === id) || null;
  });

  readonly pendingCount = computed(() => {
    return this.payments().filter(p => p.status === 'pending' || p.status === 'partial').length;
  });

  readonly paidCount = computed(() => {
    return this.payments().filter(p => p.status === 'paid').length;
  });

  readonly totalRevenue = computed(() => {
    const total = this.payments().reduce((sum, p) => {
      if (p.status === 'paid') return sum + p.totalAmount;
      return sum + p.deposit;
    }, 0);
    return this.formatCurrency(total);
  });

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

  goToPage(p: number): void {
    this.currentPage.set(p);
  }

  openDetails(id: number): void {
    this.selectedPaymentId.set(id);
    const backendId = this.bookingService.getBackendBookingId(id);
    if (backendId) {
      this.thanhtoanApi.listByLichDat(backendId).subscribe(items => this.lichdatTransactions.set(items));
    } else {
      this.lichdatTransactions.set([]);
    }
    this.showDetailModal.set(true);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  setPaymentMethod(method: string): void {
    if (method === 'cash') this.checkoutPaymentMethod.set(PaymentMethod.Cash);
    if (method === 'bank_transfer') this.checkoutPaymentMethod.set(PaymentMethod.BankTransfer);
    if (method === 'momo_qr') this.checkoutPaymentMethod.set(PaymentMethod.MomoQR);
  }

  confirmCheckout(booking: Booking): void {
    const pm = this.checkoutPaymentMethod();
    const services = booking.additionalServices || [];
    const otMin = booking.overtimeMinutes || 0;
    const otAmt = booking.overtimeAmount || 0;
    const grandTotal = this.getGrandTotal(booking);
    const checkoutAmt = grandTotal - booking.deposit;
    const timeStr = booking.checkoutTime || new Date().toTimeString().slice(0, 5); // default to current time HH:MM

    this.bookingService.checkOut(
      booking.id,
      services,
      otMin,
      otAmt,
      checkoutAmt,
      pm,
      timeStr
    ).subscribe({
      next: () => {
        this.customerService.addCompletedBooking(booking.customerPhone, booking.customerName, grandTotal);
        this.showDetailModal.set(false);
        this.reloadThanhToans();
        this.apiConfig.triggerSuccess('Thanh toán thành công.');
      },
      error: (err) => this.apiConfig.triggerError(err.error?.message || 'Thanh toán thất bại.')
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'Đã thanh toán';
      case 'pending': return 'Chờ thanh toán';
      case 'partial': return 'Đã cọc một phần';
      default: return status;
    }
  }

  getServicesTotal(booking: Booking): number {
    if (!booking.additionalServices) return 0;
    return booking.additionalServices.reduce((sum, s) => sum + s.price * s.quantity, 0);
  }

  getGrandTotal(booking: Booking): number {
    return booking.totalAmount + (booking.overtimeAmount || 0) + this.getServicesTotal(booking);
  }

  getPaymentMethodLabel(pm?: string): string {
    switch (pm) {
      case 'cash': return 'Tiền mặt';
      case 'bank_transfer': return 'Chuyển khoản';
      case 'momo_qr': return 'MOMO / QR';
      default: return 'Không xác định';
    }
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as any;
    this.statusFilter.set(val);
    this.currentPage.set(1);
  }

  onPageSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(val);
    this.currentPage.set(1);
  }
}

