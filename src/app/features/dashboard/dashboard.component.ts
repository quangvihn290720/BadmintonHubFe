import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { BookingService } from '../../core/services/booking.service';
import { BookingStateService } from '../../core/services/booking-state.service';
import { PricingService } from '../../core/services/pricing.service';
import { CustomerService } from '../../core/services/customer.service';
import { AdditionalServiceService, ServiceItem } from '../../core/services/additional-service.service';
import { BookingStatus, Court, Booking, PaymentMethod, TimeSlot } from '../../core/models';
import { CourtApiService } from '../../core/services/court-api.service';

@Component({
  selector: 'app-dashboard',
  imports: [StatCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  public readonly bookingService = inject(BookingService);
  private readonly bookingState = inject(BookingStateService);
  private readonly pricingService = inject(PricingService);
  private readonly customerService = inject(CustomerService);
  private readonly additionalService = inject(AdditionalServiceService);
  private readonly courtApi = inject(CourtApiService);
  private readonly router = inject(Router);

  readonly courts = this.courtApi.courts;
  readonly hourLabels = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  readonly hourHeight = 90; // pixels

  // Reactive State Signals
  readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly simulatedMinutes = signal<number>(720);
  readonly showDetailModal = signal<boolean>(false);
  readonly currentWeekStart = signal<Date>(new Date());

  // Toast Notification Signals
  readonly toastMessage = signal<string>('');
  readonly toastType = signal<'success' | 'error'>('success');

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 3000);
  }

  // Computed week date tabs for the calendar quick switcher strip (next 7 days from start)
  readonly dateTabs = computed(() => {
    const start = this.currentWeekStart();
    const weekdays = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const tabs = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      tabs.push({
        dateStr,
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        dayLabel: weekdays[d.getDay()],
        isToday: dateStr === new Date().toISOString().split('T')[0]
      });
    }
    return tabs;
  });

  // Computed time string from simulatedMinutes
  readonly simulatedTime = computed(() => {
    const totalMinutes = this.simulatedMinutes();
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  // Reactive Stats Computed from selectedDate and simulatedTime and booking signal
  readonly stats = computed(() => {
    this.bookingService.bookings();
    return this.bookingService.getTodayStats(this.selectedDate(), this.simulatedTime());
  });

  // Modals state signals
  readonly showCheckInModal = signal<boolean>(false);
  readonly showCheckoutModal = signal<boolean>(false);
  readonly showCancelConfirmModal = signal<boolean>(false);
  readonly activeBooking = signal<Booking | null>(null);

  // Beverage/Services checklist signal
  readonly serviceItems = signal<ServiceItem[]>([]);

  // Computed selected services (quantity > 0)
  readonly selectedServices = computed(() => this.serviceItems().filter(i => i.quantity && i.quantity > 0));

  // Service Popup & Reschedule signals
  readonly showServicePopup = signal<boolean>(false);
  readonly showRescheduleModal = signal<boolean>(false);
  readonly rescheduleCourtId = signal<number>(1);
  readonly rescheduleDate = signal<string>('');
  readonly rescheduleStart = signal<string>('06:00');
  readonly rescheduleEnd = signal<string>('07:00');
  readonly rescheduleHours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

  readonly checkoutPaymentMethod = signal<PaymentMethod>(PaymentMethod.Cash);

  // Computed Overtime & Fee rounded by 15-minute components:
  // <= 15: 0 mins.
  // 16 to 40 (or 20 to 40): 30 mins.
  // > 40: 60 mins (1 hour)
  readonly checkoutCalc = computed(() => {
    const booking = this.activeBooking();
    const simTimeStr = this.simulatedTime();
    if (!booking) return { overtimeMinutes: 0, overtimeAmount: 0 };
    
    // Prevent overtime calculations on future bookings
    if (booking.date > this.selectedDate()) {
      return { overtimeMinutes: 0, overtimeAmount: 0 };
    }

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const schedEnd = toMin(booking.endTime);
    const simTime = toMin(simTimeStr);
    
    let overtimeMinutes = 0;
    let overtimeAmount = 0;

    if (simTime > schedEnd) {
      const rawOvertime = simTime - schedEnd;
      const hours = Math.floor(rawOvertime / 60);
      const mins = rawOvertime % 60;
      let extra = 0;
      if (mins <= 15) {
        extra = 0;
      } else if (mins <= 40) {
        extra = 30;
      } else {
        extra = 60;
      }
      overtimeMinutes = hours * 60 + extra;
      
      const ratePerHour = booking.courtName.toLowerCase().includes('vip') ? 180000 : 100000;
      overtimeAmount = Math.round((overtimeMinutes / 60) * ratePerHour);
    }
    
    return { overtimeMinutes, overtimeAmount };
  });

  // Computed totals for service billing
  readonly servicesTotal = computed(() => {
    return this.serviceItems().reduce((sum, item) => sum + item.price * (item.quantity || 0), 0);
  });

  readonly totalBill = computed(() => {
    const booking = this.activeBooking();
    if (!booking) return 0;
    return booking.totalAmount + this.checkoutCalc().overtimeAmount + this.servicesTotal();
  });

  readonly balanceDue = computed(() => {
    const booking = this.activeBooking();
    if (!booking) return 0;
    return Math.max(0, this.totalBill() - booking.deposit);
  });

  ngOnInit(): void {
    this.syncClockToSim();
    setTimeout(() => {
      this.scrollToCurrentTime();
    }, 150);
    const dbServices = this.additionalService.getServices();
    this.serviceItems.set(dbServices.map(s => ({ ...s, quantity: 0 })));
    this.bookingService.fetchSchedule(this.selectedDate()).subscribe();
  }

  syncClockToSim(): void {
    const now = new Date();
    this.simulatedMinutes.set(now.getHours() * 60 + now.getMinutes());
  }

  onTimeSliderChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.simulatedMinutes.set(val);
  }

  onDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.selectedDate.set(val);
    this.bookingService.fetchSchedule(val).subscribe();
    const d = new Date(val + 'T00:00:00');
    this.currentWeekStart.set(d);
  }

  prevWeek(): void {
    this.currentWeekStart.update(d => {
      const newD = new Date(d);
      newD.setDate(d.getDate() - 7);
      return newD;
    });
  }

  nextWeek(): void {
    this.currentWeekStart.update(d => {
      const newD = new Date(d);
      newD.setDate(d.getDate() + 7);
      return newD;
    });
  }

  jumpToToday(): void {
    const today = new Date();
    this.currentWeekStart.set(new Date());
    const todayStr = today.toISOString().split('T')[0];
    this.selectedDate.set(todayStr);
    this.bookingService.fetchSchedule(todayStr).subscribe();
    setTimeout(() => {
      this.scrollToCurrentTime();
    }, 50);
  }

  selectQuickDate(dateStr: string): void {
    this.selectedDate.set(dateStr);
    this.bookingService.fetchSchedule(dateStr).subscribe();
    setTimeout(() => {
      this.scrollToCurrentTime();
    }, 50);
  }

  getBookingsForCourt(courtId: number): Booking[] {
    this.bookingService.bookings();
    return this.bookingService.getBookingsByCourtAndDate(courtId, this.selectedDate())
      .filter(b => b.status !== BookingStatus.Cancelled);
  }

  getBookingTop(booking: Booking): number {
    const [sh, sm] = booking.startTime.split(':').map(Number);
    const startHour = sh + sm / 60;
    const offset = startHour - 6; // Starts at 06:00
    return offset * this.hourHeight;
  }

  getBookingHeight(booking: Booking): number {
    const [sh, sm] = booking.startTime.split(':').map(Number);
    const [eh, em] = booking.endTime.split(':').map(Number);
    const startHour = sh + sm / 60;
    const endHour = eh + em / 60;
    const duration = endHour - startHour;
    return duration * this.hourHeight;
  }

  onGridCellClick(court: Court, hourStr: string): void {
    if (this.isPastHour(hourStr)) return;
    this.bookingState.clear();
    this.bookingState.setPartial({
      date: this.selectedDate(),
      courtId: court.id,
      courtName: court.name,
      courtType: court.type,
      startTime: hourStr,
      endTime: this.addMinutes(hourStr, 60) // default 1 hour
    });
    this.router.navigate(['/booking/new']);
  }

  onBookingCardClick(booking: Booking, event: Event): void {
    event.stopPropagation();
    this.activeBooking.set(booking);
    if (booking.status === BookingStatus.Deposited) {
      this.showCheckInModal.set(true);
    } else if (booking.status === BookingStatus.Playing) {
      this.resetCheckoutModalData();
      this.showCheckoutModal.set(true);
    } else if (booking.status === BookingStatus.Completed) {
      this.showDetailModal.set(true);
    }
  }

  // Check-In Actions
  confirmCheckIn(): void {
    const booking = this.activeBooking();
    if (booking && this.canCheckIn(booking)) {
      this.bookingService.checkIn(booking.id);
      this.showCheckInModal.set(false);
    }
  }

  canCheckIn(booking: Booking | null): boolean {
    if (!booking) return false;
    
    // Date must be today
    const todayStr = new Date().toISOString().split('T')[0];
    if (booking.date !== todayStr) return false;

    // Time must be within 15 minutes of start time
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const startMin = toMin(booking.startTime);
    const currentMin = this.simulatedMinutes();

    return currentMin >= startMin - 15;
  }

  // Check-Out Billing Calculations
  resetCheckoutModalData(): void {
    this.checkoutPaymentMethod.set(PaymentMethod.Cash);
    const dbServices = this.additionalService.getServices();
    this.serviceItems.set(dbServices.map(s => ({ ...s, quantity: 0 })));
  }

  adjustServiceQty(itemKey: string, delta: number): void {
    this.serviceItems.update(items =>
      items.map(item =>
        item.key === itemKey
          ? { ...item, quantity: Math.max(0, (item.quantity || 0) + delta) }
          : item
      )
    );
  }

  confirmCheckout(): void {
    const booking = this.activeBooking();
    if (booking) {
      const services = this.serviceItems()
        .filter(item => (item.quantity || 0) > 0)
        .map(item => ({ key: item.key, name: item.name, price: item.price, quantity: item.quantity || 0 }));
      
      const grandTotal = this.totalBill();
      this.bookingService.checkOut(
        booking.id,
        services,
        this.checkoutCalc().overtimeMinutes,
        this.checkoutCalc().overtimeAmount,
        this.balanceDue(),
        this.checkoutPaymentMethod(),
        this.simulatedTime()
      ).subscribe({
        next: () => {
          this.customerService.addCompletedBooking(booking.customerPhone, booking.customerName, grandTotal);
          this.showCheckoutModal.set(false);
          this.showToast('Hoàn tất ca chơi và thanh toán thành công!', 'success');
        },
        error: () => this.showToast('Không thể hoàn tất ca chơi. Vui lòng thử lại.', 'error')
      });
    }
  }

  setPaymentMethod(method: string): void {
    if (method === 'cash') this.checkoutPaymentMethod.set(PaymentMethod.Cash);
    if (method === 'bank_transfer') this.checkoutPaymentMethod.set(PaymentMethod.BankTransfer);
    if (method === 'momo_qr') this.checkoutPaymentMethod.set(PaymentMethod.MomoQR);
  }

  formatCurrency(amount: number): string { return this.pricingService.formatCurrency(amount); }

  formatDateDisplay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const dayIndex = d.getDay();
    let dayLabel = 'Chủ nhật';
    switch (dayIndex) {
      case 1: dayLabel = 'Thứ 2'; break;
      case 2: dayLabel = 'Thứ 3'; break;
      case 3: dayLabel = 'Thứ 4'; break;
      case 4: dayLabel = 'Thứ 5'; break;
      case 5: dayLabel = 'Thứ 6'; break;
      case 6: dayLabel = 'Thứ 7'; break;
    }
    return `${dayLabel} - Ngày ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  isPastHour(hourStr: string): boolean {
    const todayStr = new Date().toISOString().split('T')[0];
    const selDate = this.selectedDate();
    
    if (selDate < todayStr) return true;
    if (selDate > todayStr) return false;
    
    const [h, m] = hourStr.split(':').map(Number);
    const cellMin = h * 60 + m;
    
    return cellMin < this.simulatedMinutes();
  }

  isPastDay(): boolean {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.selectedDate() < todayStr;
  }

  isToday(): boolean {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.selectedDate() === todayStr;
  }

  isTimeWithinGrid(): boolean {
    const m = this.simulatedMinutes();
    return m >= 6 * 60 && m <= 22 * 60;
  }

  getCurrentTimeOffset(): number {
    const m = this.simulatedMinutes();
    const offsetMin = m - 6 * 60;
    return offsetMin * (this.hourHeight / 60);
  }
  scrollToCurrentTime(): void {
    const wrapper = document.querySelector('.schedule-grid-wrapper');
    if (wrapper) {
      const offset = this.getCurrentTimeOffset();
      wrapper.scrollTop = Math.max(0, offset - 150);
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

  confirmCancelBooking(bookingId: number): void {
    this.showCheckInModal.set(false);
    this.showDetailModal.set(false);
    this.showCancelConfirmModal.set(true);
  }

  executeCancelBooking(): void {
    const booking = this.activeBooking();
    if (booking) {
      this.bookingService.cancelBooking(booking.id);
      this.showCancelConfirmModal.set(false);
      this.showToast('Đã hủy lịch đặt sân thành công!', 'success');
    }
  }

  findNextAvailableSlot(booking: Booking): { startTime: string; endTime: string } {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toStr = (m: number) => {
      const h = Math.floor(m / 60) % 24;
      const min = m % 60;
      return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    };

    const durationMin = toMin(booking.endTime) - toMin(booking.startTime);
    const courtId = booking.courtId;
    const date = booking.date;

    let currentStartMin = toMin(booking.startTime);
    const maxDayMin = 22 * 60; // 22:00 max end time

    // Keep advancing in 60-minute steps until we find a conflict-free slot
    while (currentStartMin + durationMin <= maxDayMin) {
      currentStartMin += 60;
      const candidateStart = toStr(currentStartMin);
      const candidateEnd = toStr(currentStartMin + durationMin);

      const conflictResult = this.bookingService.checkConflictForEdit(
        booking.id,
        courtId,
        date,
        candidateStart,
        candidateEnd
      );

      if (!conflictResult.hasConflict) {
        return { startTime: candidateStart, endTime: candidateEnd };
      }
    }

    // Fallback: If no future slot on that day is available, return the original
    return { startTime: booking.startTime, endTime: booking.endTime };
  }

  openRescheduleModal(booking: Booking): void {
    this.activeBooking.set(booking);
    
    // Find next available slot
    const nextSlot = this.findNextAvailableSlot(booking);
    
    this.rescheduleCourtId.set(booking.courtId);
    this.rescheduleDate.set(booking.date);
    this.rescheduleStart.set(nextSlot.startTime);
    this.rescheduleEnd.set(nextSlot.endTime);
    
    this.showCheckInModal.set(false);
    this.showRescheduleModal.set(true);
  }

  confirmReschedule(): void {
    const booking = this.activeBooking();
    if (!booking) return;

    const courtId = this.rescheduleCourtId();
    const date = this.rescheduleDate();
    const start = this.rescheduleStart();
    const end = this.rescheduleEnd();

    const court = this.courts().find(c => c.id === courtId);
    const courtName = court ? court.name : booking.courtName;

    // Validation: start time must be before end time
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    if (toMin(start) >= toMin(end)) {
      this.showToast('Thời gian bắt đầu phải trước thời gian kết thúc!', 'error');
      return;
    }

    // Conflict check
    const conflictResult = this.bookingService.checkConflictForEdit(booking.id, courtId, date, start, end);
    if (conflictResult.hasConflict) {
      this.showToast(conflictResult.message, 'error');
      return;
    }

    // Update schedule
    this.bookingService.updateBookingSchedule(booking.id, courtId, courtName, date, start, end);
    this.showToast('Thay đổi lịch đặt sân thành công!', 'success');
    this.showRescheduleModal.set(false);
  }

  private addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }
}
