import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { PricingService } from '../../core/services/pricing.service';
import { ReportApiService } from '../../core/services/report-api.service';
import { DailyRevenueReport } from '../../core/models/backend-api.model';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingStatus, Booking } from '../../core/models';
import { addDaysToDateString, todayLocalDate } from '../../core/utils/date.utils';

@Component({
  selector: 'app-reports',
  imports: [StatCardComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsComponent {
  private readonly pricingService = inject(PricingService);
  private readonly reportApi = inject(ReportApiService);
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);

  readonly selectedDate = signal<string>(todayLocalDate());
  readonly dailyReport = signal<DailyRevenueReport | null>(null);
  readonly rangeReports = signal<DailyRevenueReport[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<'stats' | 'transactions'>('stats');

  // Search and filters for the transaction list
  readonly searchQuery = signal<string>('');
  readonly staffFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');

  readonly weekData = computed(() => {
    const reports = this.rangeReports();
    const max = Math.max(...reports.map(report => Number(report.netRevenue || 0)), 1);
    return reports.map(report => {
      const date = new Date(`${report.date}T00:00:00`);
      const value = Number(report.netRevenue || 0);
      return {
        date: report.date,
        label: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()],
        value: this.shortCurrency(value),
        rawVal: value,
        percent: Math.round((value / max) * 100)
      };
    });
  });

  readonly paymentBreakdownRows = computed(() => {
    const report = this.dailyReport();
    if (!report) return [];
    return Object.entries(report.paymentBreakdownByMethod || {}).map(([method, amount]) => ({
      method,
      label: this.paymentMethodLabel(method),
      amount: Number(amount || 0)
    }));
  });

  readonly revenueStructureData = computed(() => {
    const report = this.dailyReport();
    const courtFee = Number(report?.totalCourtAmount || 0);
    const services = Number(report?.totalServiceAmount || 0);
    const discount = Number(report?.totalDiscountAmount || 0);
    const total = Math.max(courtFee + services + discount, 1);
    return {
      courtFee,
      courtFeePercent: Math.round((courtFee / total) * 100),
      services,
      servicesPercent: Math.round((services / total) * 100),
      discount,
      discountPercent: Math.round((discount / total) * 100),
      total: Number(report?.netRevenue || 0)
    };
  });

  // Advanced Statistic 1: Service Revenue Details
  readonly serviceRevenueDetails = computed(() => {
    const date = this.selectedDate();
    const bookings = this.bookingService.getAllBookings().filter(b => b.date === date && b.status === BookingStatus.Completed);
    const serviceMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    bookings.forEach(b => {
      if (b.additionalServices) {
        b.additionalServices.forEach(s => {
          if (!serviceMap.has(s.name)) {
            serviceMap.set(s.name, { name: s.name, quantity: 0, revenue: 0 });
          }
          const item = serviceMap.get(s.name)!;
          item.quantity += s.quantity;
          item.revenue += s.price * s.quantity;
        });
      }
    });
    
    return Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);
  });

  // Advanced Statistic 2: Hourly Booking Density
  readonly hourlyBookingDensity = computed(() => {
    const date = this.selectedDate();
    const bookings = this.bookingService.getBookingsByDate(date).filter(b => b.status !== BookingStatus.Cancelled);
    const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    
    const density = hours.map(h => {
      const [hHour] = h.split(':').map(Number);
      const count = bookings.filter(b => {
        const [sh] = b.startTime.split(':').map(Number);
        const [eh] = b.endTime.split(':').map(Number);
        return hHour >= sh && hHour < eh;
      }).length;
      return { hour: h, count };
    });
    
    const maxCount = Math.max(...density.map(d => d.count), 1);
    return density.map(d => ({
      ...d,
      percent: Math.round((d.count / maxCount) * 100)
    }));
  });

  // Advanced Statistic 3: Top-spending Customers
  readonly topCustomers = computed(() => {
    const bookings = this.bookingService.getAllBookings();
    const customerMap = new Map<string, { name: string; phone: string; count: number; spent: number }>();
    
    bookings.forEach(b => {
      if (!b.customerPhone) return;
      if (!customerMap.has(b.customerPhone)) {
        customerMap.set(b.customerPhone, { name: b.customerName, phone: b.customerPhone, count: 0, spent: 0 });
      }
      const item = customerMap.get(b.customerPhone)!;
      item.count += 1;
      let spent = b.deposit;
      if (b.status === BookingStatus.Completed) {
        spent += (b.checkoutAmount || 0);
      }
      item.spent += spent;
    });
    
    return Array.from(customerMap.values())
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  });

  // Advanced Statistic 4: Staff Productivity Stats
  readonly staffProductivity = computed(() => {
    const bookings = this.bookingService.getAllBookings();
    const staffs = this.authService.getAllStaff();
    const productivityMap = new Map<string, { name: string; count: number; revenue: number }>();
    
    staffs.forEach(s => {
      productivityMap.set(s.name, { name: s.name, count: 0, revenue: 0 });
    });
    
    bookings.forEach(b => {
      const staffName = b.staffName || 'Hệ thống';
      if (!productivityMap.has(staffName)) {
        productivityMap.set(staffName, { name: staffName, count: 0, revenue: 0 });
      }
      const data = productivityMap.get(staffName)!;
      data.count += 1;
      let amount = b.deposit;
      if (b.status === BookingStatus.Completed) {
        const srvAmt = b.additionalServices?.reduce((sum, s) => sum + s.price * s.quantity, 0) || 0;
        amount = b.totalAmount + (b.overtimeAmount || 0) + srvAmt;
      }
      data.revenue += amount;
    });
    
    return Array.from(productivityMap.values()).sort((a, b) => b.revenue - a.revenue);
  });

  // Filtered booking logs for transaction view
  readonly filteredBookings = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const staff = this.staffFilter();
    const status = this.statusFilter();
    const date = this.selectedDate();
    
    // Show bookings for the selected date
    let list = this.bookingService.getBookingsByDate(date);
    
    if (staff !== 'all') {
      list = list.filter(b => (b.staffName || 'Hệ thống') === staff);
    }
    
    if (status !== 'all') {
      list = list.filter(b => b.status === status);
    }
    
    if (query) {
      list = list.filter(b =>
        b.code.toLowerCase().includes(query) ||
        b.customerName.toLowerCase().includes(query) ||
        (b.staffName || '').toLowerCase().includes(query) ||
        b.courtName.toLowerCase().includes(query)
      );
    }
    
    return list;
  });

  constructor() {
    this.loadReport(this.selectedDate());
  }

  loadReport(date: string): void {
    this.selectedDate.set(date);
    this.loading.set(true);
    this.error.set(null);
    this.bookingService.fetchBookings(date);
    const to = new Date(`${date}T00:00:00`);
    const from = new Date(to);
    from.setDate(to.getDate() - 6);
    const fromStr = from.toISOString().split('T')[0];

    this.reportApi.getDailyRevenue(date).subscribe({
      next: report => this.dailyReport.set(report || this.emptyReport(date)),
      error: err => {
        this.error.set(err.error?.message || 'Không tải được báo cáo doanh thu.');
        this.dailyReport.set(this.emptyReport(date));
      }
    });

    this.reportApi.getRevenueRange(fromStr, date).subscribe({
      next: reports => {
        this.rangeReports.set(reports.length ? reports : [this.emptyReport(date)]);
        this.loading.set(false);
      },
      error: () => {
        this.rangeReports.set([this.emptyReport(date)]);
        this.loading.set(false);
      }
    });
  }

  onDateChange(event: Event): void {
    this.loadReport((event.target as HTMLInputElement).value);
  }

  adjustDate(days: number): void {
    this.loadReport(addDaysToDateString(this.selectedDate(), days));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00`);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  paymentMethodLabel(method: string): string {
    switch (method) {
      case 'TIEN_MAT':
      case 'CASH':
        return 'Tiền mặt';
      case 'CHUYEN_KHOAN':
      case 'BANK_TRANSFER':
        return 'Chuyển khoản';
      case 'MOMO':
      case 'QR_CODE':
        return 'QR / Momo';
      default: return method;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'available': return 'Trống';
      case 'deposited': return 'Đã cọc';
      case 'playing': return 'Đang chơi';
      case 'cancelled': return 'Đã hủy';
      case 'completed': return 'Hoàn thành';
      default: return status;
    }
  }

  exportToExcel(): void {
    const report = this.dailyReport();
    if (!report) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += `BÁO CÁO DOANH THU CLB CẦU LÔNG - NGÀY ${this.formatDate(report.date)}\n\n`;
    
    csvContent += 'THÔNG SỐ CHUNG\n';
    csvContent += `Doanh thu ròng,${report.netRevenue} VND\n`;
    csvContent += `Đặt sân hoàn thành,${report.completedBookingCount}\n`;
    csvContent += `Đặt sân đã hủy,${report.cancelledBookingCount}\n`;
    csvContent += `Doanh thu dịch vụ,${report.serviceItemRevenue} VND\n\n`;

    csvContent += 'CHI TIẾT DOANH THU DỊCH VỤ\n';
    csvContent += 'Tên dịch vụ,Số lượng bán,Doanh thu\n';
    this.serviceRevenueDetails().forEach(s => {
      csvContent += `"${s.name}",${s.quantity},${s.revenue} VND\n`;
    });
    csvContent += '\n';

    csvContent += 'MẬT ĐỘ ĐẶT SÂN THEO KHUNG GIỜ\n';
    csvContent += 'Khung giờ,Số lượt đặt\n';
    this.hourlyBookingDensity().forEach(h => {
      csvContent += `${h.hour},${h.count}\n`;
    });
    csvContent += '\n';

    csvContent += 'KHÁCH HÀNG CHI TIÊU CAO\n';
    csvContent += 'Tên khách hàng,Số điện thoại,Lượt đặt,Tổng chi tiêu\n';
    this.topCustomers().forEach(c => {
      csvContent += `"${c.name}","${c.phone}",${c.count},${c.spent} VND\n`;
    });
    csvContent += '\n';

    csvContent += 'DANH SÁCH GIAO DỊCH TRONG NGÀY\n';
    csvContent += 'Mã đặt sân,Nhân viên,Khách hàng,Số điện thoại,Sân,Khung giờ,Tổng tiền,Đã cọc,Trạng thái\n';
    const dayBookings = this.bookingService.getBookingsByDate(report.date);
    dayBookings.forEach(b => {
      const servicesTotal = b.additionalServices?.reduce((sum, s) => sum + s.price * s.quantity, 0) || 0;
      const total = b.totalAmount + (b.overtimeAmount || 0) + servicesTotal;
      csvContent += `"${b.code}","${b.staffName || 'Hệ thống'}","${b.customerName}","${b.customerPhone}","${b.courtName}","${b.startTime}-${b.endTime}",${total},${b.deposit},"${this.getStatusLabel(b.status)}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_cao_doanh_thu_${report.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private shortCurrency(amount: number): string {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
    return `${amount}`;
  }

  private emptyReport(date: string): DailyRevenueReport {
    return {
      date,
      totalCourtAmount: 0,
      totalServiceAmount: 0,
      totalDiscountAmount: 0,
      totalDepositAmount: 0,
      totalFinalPaymentAmount: 0,
      totalRefundAmount: 0,
      netRevenue: 0,
      completedBookingCount: 0,
      cancelledBookingCount: 0,
      serviceItemRevenue: 0,
      paymentBreakdownByMethod: {}
    };
  }
}
