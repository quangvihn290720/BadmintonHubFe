import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { MockBookingService } from '../../core/services/mock-booking.service';
import { PricingService } from '../../core/services/pricing.service';
import { BookingStatus, Booking } from '../../core/models';

@Component({
  selector: 'app-reports',
  imports: [StatCardComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsComponent {
  private readonly bookingService = inject(MockBookingService);
  private readonly pricingService = inject(PricingService);

  // Tab State
  readonly activeTab = signal<'stats' | 'history' | 'cancellations'>('stats');

  // Search & Pagination Signals for Historical Bookings
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'all' | 'completed' | 'cancelled'>('all');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);
  readonly selectedBookingId = signal<number | null>(null);
  readonly showDetailModal = signal<boolean>(false);

  readonly monthRevenue = computed(() => {
    return this.bookingService.bookings()
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + b.totalAmount, 0);
  });

  readonly totalBookingsCount = computed(() => {
    return this.bookingService.bookings().filter(b => b.status !== 'cancelled').length;
  });

  readonly cancelledCount = computed(() => {
    return this.bookingService.bookings().filter(b => b.status === 'cancelled').length;
  });

  readonly utilizationRate = computed(() => {
    const list = this.bookingService.bookings().filter(b => b.status !== 'cancelled');
    const totalHours = list.reduce((sum, b) => {
      const [sh, sm] = b.startTime.split(':').map(Number);
      const [eh, em] = b.endTime.split(':').map(Number);
      return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }, 0);
    // Capacitate based on mock data distribution
    const rate = Math.round((totalHours / 120) * 100);
    return `${Math.min(Math.max(rate, 45), 92)}%`;
  });

  readonly weekData = computed(() => {
    const list = this.bookingService.bookings();
    const result = [];
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    // Generate dates relative to today
    const baseDate = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = weekdays[d.getDay()];
      
      const dayRev = list
        .filter(b => b.date === dateStr && b.status !== 'cancelled')
        .reduce((sum, b) => sum + b.totalAmount, 0);
      
      result.push({
        date: dateStr,
        label: dayLabel,
        value: dayRev >= 1000000 ? `${(dayRev / 1000000).toFixed(1)}M` : (dayRev >= 1000 ? `${dayRev / 1000}K` : `${dayRev}`),
        rawVal: dayRev
      });
    }
    
    const maxRev = Math.max(...result.map(r => r.rawVal), 1);
    return result.map(r => ({
      ...r,
      percent: Math.round((r.rawVal / maxRev) * 100)
    }));
  });

  readonly topCourts = computed(() => {
    const list = this.bookingService.bookings().filter(b => b.status !== 'cancelled');
    const counts: Record<string, number> = {};
    list.forEach(b => {
      counts[b.courtName] = (counts[b.courtName] || 0) + 1;
    });
    
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
      
    const maxCount = sorted.length > 0 ? sorted[0].count : 1;
    return sorted.map(c => ({
      ...c,
      percent: Math.round((c.count / maxCount) * 100)
    }));
  });

  readonly peakHoursData = computed(() => {
    const list = this.bookingService.bookings().filter(b => b.status !== BookingStatus.Cancelled);
    let morning = 0;
    let noon = 0;
    let afternoon = 0;
    let evening = 0;
    
    list.forEach(b => {
      const [h] = b.startTime.split(':').map(Number);
      if (h >= 6 && h < 11) morning++;
      else if (h >= 11 && h < 14) noon++;
      else if (h >= 14 && h < 17) afternoon++;
      else if (h >= 17 && h <= 22) evening++;
    });
    
    const total = morning + noon + afternoon + evening || 1;
    return [
      { label: 'Sáng (6h - 11h)', count: morning, percent: Math.round((morning / total) * 100) },
      { label: 'Trưa (11h - 14h)', count: noon, percent: Math.round((noon / total) * 100) },
      { label: 'Chiều (14h - 17h)', count: afternoon, percent: Math.round((afternoon / total) * 100) },
      { label: 'Tối (17h - 22h)', count: evening, percent: Math.round((evening / total) * 100) }
    ];
  });

  readonly revenueStructureData = computed(() => {
    const list = this.bookingService.bookings().filter(b => b.status !== BookingStatus.Cancelled);
    let courtFeeTotal = 0;
    let servicesTotal = 0;
    let overtimeTotal = 0;
    
    list.forEach(b => {
      courtFeeTotal += b.totalAmount;
      servicesTotal += b.additionalServices?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
      overtimeTotal += b.overtimeAmount || 0;
    });
    
    const total = courtFeeTotal + servicesTotal + overtimeTotal || 1;
    return {
      courtFee: courtFeeTotal,
      courtFeePercent: Math.round((courtFeeTotal / total) * 100),
      services: servicesTotal,
      servicesPercent: Math.round((servicesTotal / total) * 100),
      overtime: overtimeTotal,
      overtimePercent: Math.round((overtimeTotal / total) * 100),
      total: total
    };
  });

  readonly courtPerformanceData = computed(() => {
    const list = this.bookingService.bookings().filter(b => b.status !== BookingStatus.Cancelled);
    
    const courts = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `Sân ${i + 1}`,
      count: 0,
      revenue: 0,
      percent: 0
    }));
    
    list.forEach(b => {
      let courtIndex = b.courtId - 1;
      if (courtIndex < 0 || courtIndex >= 8) {
        const match = b.courtName.match(/\d+/);
        if (match) {
          courtIndex = parseInt(match[0], 10) - 1;
        }
      }
      if (courtIndex >= 0 && courtIndex < 8) {
        courts[courtIndex].count++;
        const srv = b.additionalServices?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
        const ot = b.overtimeAmount || 0;
        courts[courtIndex].revenue += b.totalAmount + srv + ot;
      }
    });
    
    const maxRev = Math.max(...courts.map(c => c.revenue), 1);
    return courts.map(c => ({
      ...c,
      percent: Math.round((c.revenue / maxRev) * 100)
    })).sort((a, b) => b.revenue - a.revenue);
  });

  readonly cancelledBookings = computed(() => {
    return this.bookingService.bookings()
      .filter(b => b.status === 'cancelled')
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  });

  // Historical Bookings List (Completed & Cancelled)
  readonly payments = computed(() => {
    const bookings = this.bookingService.bookings()
      .filter(b => b.status === BookingStatus.Completed || b.status === BookingStatus.Cancelled);
    
    return bookings.map(b => {
      let status: 'paid' | 'cancelled' = 'paid';
      if (b.status === BookingStatus.Cancelled) {
        status = 'cancelled';
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

  readonly filteredPayments = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const baseList = this.payments();

    let list = baseList;
    if (status !== 'all') {
      const mappedStatus = status === 'completed' ? 'paid' : 'cancelled';
      list = baseList.filter(p => p.status === mappedStatus);
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
    const id = this.selectedBookingId();
    if (!id) return null;
    return this.bookingService.getAllBookings().find(b => b.id === id) || null;
  });

  formatCurrency(amount: number): string {
    return this.pricingService.formatCurrency(amount);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  onTabChange(tab: 'stats' | 'history' | 'cancellations'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.searchQuery.set('');
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

  openDetails(id: number): void {
    this.selectedBookingId.set(id);
    this.showDetailModal.set(true);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'Đã hoàn thành';
      case 'cancelled': return 'Đã hủy lịch';
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

