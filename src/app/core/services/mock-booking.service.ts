import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { Booking, BookingStatus, PaymentMethod } from '../models';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import { BackendScheduleBooking, CreateBookingRequest, CreateBookingResponse } from '../models/backend-api.model';
import { ApiConfigService } from './api-config.service';
import { AuthService } from './auth.service';
import { CourtApiService } from './court-api.service';
import { MockCustomerService } from './mock-customer.service';
import { PricingService } from './pricing.service';

export interface ConflictResult {
  hasConflict: boolean;
  conflictBooking?: Booking;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class MockBookingService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);
  private readonly authService = inject(AuthService);
  private readonly courtApi = inject(CourtApiService);
  private readonly customerService = inject(MockCustomerService);
  private readonly pricingService = inject(PricingService);

  private readonly bookingsSignal = signal<Booking[]>([]);
  readonly bookings = this.bookingsSignal.asReadonly();

  private nextId = 1;
  private readonly backendIds = new Map<number, string>();

  constructor() {
    this.fetchBookings();
  }

  fetchBookings(date = new Date().toISOString().split('T')[0]): void {
    this.fetchSchedule(date).subscribe();
  }

  fetchSchedule(date: string): Observable<Booking[]> {
    return (this.http.get(API_ENDPOINTS.BOOKINGS.SCHEDULES, {
      params: { date }
    }) as Observable<ApiResponse<BackendScheduleBooking[]>>).pipe(
      map(response => (response.data || []).map((item: BackendScheduleBooking) => this.toUiBooking(item))),
      tap(bookings => {
        const otherDates = this.bookingsSignal().filter(booking => booking.date !== date);
        this.bookingsSignal.set([...otherDates, ...bookings]);
      }),
      catchError(() => of([]))
    );
  }

  getAllBookings(): Booking[] {
    return [...this.bookingsSignal()];
  }

  getBookingsByDate(date: string): Booking[] {
    return this.bookingsSignal().filter(b => b.date === date);
  }

  getBookingsByCourtAndDate(courtId: number, date: string): Booking[] {
    return this.bookingsSignal().filter(b => b.courtId === courtId && b.date === date);
  }

  checkConflict(courtId: number, date: string, startTime: string, endTime: string): ConflictResult {
    const existing = this.bookingsSignal().find(b =>
      b.courtId === courtId &&
      b.date === date &&
      b.status !== BookingStatus.Cancelled &&
      this.timesOverlap(b.startTime, b.endTime, startTime, endTime)
    );

    if (existing) {
      return {
        hasConflict: true,
        conflictBooking: existing,
        message: `Sân đã được đặt từ ${existing.startTime} - ${existing.endTime} (${this.getStatusLabel(existing.status)})`
      };
    }

    return { hasConflict: false, message: 'Lịch trống, có thể đặt sân' };
  }

  generateBookingCode(): string {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const seq = this.nextId.toString().padStart(3, '0');
    return `BK-${dateStr}-${seq}`;
  }

  createBooking(data: CreateUiBookingData): Booking {
    const booking = this.optimisticBooking(data);
    this.bookingsSignal.update(list => [...list, booking]);
    this.createBookingAsync(data, booking).subscribe();
    return booking;
  }

  createBookingAsync(data: CreateUiBookingData, optimistic?: Booking): Observable<Booking> {
    const booking = optimistic || this.optimisticBooking(data);

    const courtId = this.courtApi.getBackendCourtId(data.courtId);
    const session = this.authService.getCurrentSession();
    if (!courtId || !session) {
      return of(booking);
    }

    const body: CreateBookingRequest = {
      customerId: this.customerService.getBackendCustomerId(data.customerId),
      employeeId: session.id,
      courtId,
      startTime: `${data.date}T${data.startTime}:00`,
      endTime: `${data.date}T${data.endTime}:00`,
      depositAmount: data.deposit,
      depositPaymentMethod: this.toBackendPaymentMethod(data.paymentMethod),
      depositTransactionCode: `DEP-${Date.now()}`
    };

    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    return (this.http.post(API_ENDPOINTS.BOOKINGS.BASE, body, { headers }) as Observable<ApiResponse<CreateBookingResponse>>).pipe(
      map(response => response.data),
      map(response => ({
        backendId: response.bookingId,
        booking: {
          ...booking,
          code: response.bookingCode,
          status: this.toUiStatus(response.status)
        }
      })),
      tap(saved => {
        this.backendIds.set(saved.booking.id, saved.backendId);
        this.replaceBooking(booking.id, saved.booking);
        this.fetchSchedule(data.date).subscribe();
      }),
      map(saved => saved.booking),
      catchError(() => of(booking))
    );
  }

  getSlotStatus(courtId: number, date: string, startTime: string, endTime: string): BookingStatus {
    const booking = this.bookingsSignal().find(b =>
      b.courtId === courtId &&
      b.date === date &&
      b.status !== BookingStatus.Cancelled &&
      this.timesOverlap(b.startTime, b.endTime, startTime, endTime)
    );
    return booking ? booking.status : BookingStatus.Available;
  }

  getBookingAtSlot(courtId: number, date: string, startTime: string, endTime: string): Booking | undefined {
    return this.bookingsSignal().find(b =>
      b.courtId === courtId &&
      b.date === date &&
      b.status !== BookingStatus.Cancelled &&
      this.timesOverlap(b.startTime, b.endTime, startTime, endTime)
    );
  }

  checkIn(bookingId: number): void {
    this.updateStatus(bookingId, BookingStatus.Playing);
    const backendId = this.backendIds.get(bookingId);
    if (backendId) {
      (this.http.post(API_ENDPOINTS.BOOKINGS.CHECKIN(backendId), {}, {
        headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() })
      }) as Observable<ApiResponse<unknown>>).pipe(catchError(() => of(null))).subscribe(() => this.fetchBookings());
    }
  }

  checkOut(
    bookingId: number,
    services: { key?: string; name: string; price: number; quantity: number }[],
    overtimeMin: number,
    overtimeAmt: number,
    checkoutAmt: number,
    pm: PaymentMethod,
    timeStr: string
  ): void {
    const booking = this.bookingsSignal().find(b => b.id === bookingId);
    const checkoutPayload = {
      additionalServices: services,
      overtimeMinutes: overtimeMin,
      overtimeAmount: overtimeAmt,
      checkoutAmount: checkoutAmt,
      checkoutPaymentMethod: pm,
      checkoutTime: timeStr,
      status: BookingStatus.Completed
    };

    this.bookingsSignal.update(list => list.map(b => b.id === bookingId ? { ...b, ...checkoutPayload } : b));

    const backendId = this.backendIds.get(bookingId);
    if (backendId && booking) {
      const serviceCalls = services
        .filter(service => service.key && service.quantity > 0)
        .map(service => (this.http.post(API_ENDPOINTS.BOOKINGS.SERVICE_ITEMS(backendId), {
          serviceItemId: service.key,
          quantity: service.quantity,
          note: service.name
        }, { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) }) as Observable<ApiResponse<unknown>>));

      const addServices$: Observable<unknown> = serviceCalls.length ? forkJoin(serviceCalls) : of([]);
      addServices$.pipe(
        switchMap(() => (this.http.post(API_ENDPOINTS.BOOKINGS.CHECKOUT(backendId), {
          actualEndTime: `${booking.date}T${timeStr}:00`,
          paymentMethod: this.toBackendPaymentMethod(pm),
          transactionCode: `FINAL-${Date.now()}`
        }, { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) }) as Observable<ApiResponse<unknown>>)),
        catchError(() => of(null))
      ).subscribe(() => this.fetchBookings(booking.date));
    }
  }

  getStatusLabel(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Available: return 'Trống';
      case BookingStatus.Deposited: return 'Đã cọc';
      case BookingStatus.Playing: return 'Đang chơi';
      case BookingStatus.Cancelled: return 'Đã hủy';
      case BookingStatus.Completed: return 'Hoàn thành';
      default: return status;
    }
  }

  getTodayStats(date: string, simulatedTime: string = '12:00'): { available: number; deposited: number; playing: number; revenue: number } {
    const todayBookings = this.getBookingsByDate(date);
    const deposited = todayBookings.filter(b => b.status === BookingStatus.Deposited).length;
    const playing = todayBookings.filter(b => b.status === BookingStatus.Playing).length;
    const revenue = todayBookings
      .filter(b => b.status !== BookingStatus.Cancelled)
      .reduce((sum, b) => sum + b.deposit + (b.checkoutAmount || 0), 0);

    let occupiedCourts = 0;
    const totalCourts = Math.max(this.courtApi.courts().length, 8);
    for (let courtId = 1; courtId <= totalCourts; courtId++) {
      const isOccupied = todayBookings.some(b =>
        b.courtId === courtId &&
        b.status !== BookingStatus.Cancelled &&
        b.status !== BookingStatus.Completed &&
        this.timesOverlap(b.startTime, b.endTime, simulatedTime, this.addMinutes(simulatedTime, 1))
      );
      if (isOccupied) occupiedCourts++;
    }
    const available = totalCourts - occupiedCourts;

    return { available, deposited, playing, revenue };
  }

  cancelBooking(bookingId: number): void {
    this.updateStatus(bookingId, BookingStatus.Cancelled);
    const booking = this.bookingsSignal().find(b => b.id === bookingId);
    const backendId = this.backendIds.get(bookingId);
    if (backendId) {
      (this.http.post(API_ENDPOINTS.BOOKINGS.CANCEL(backendId), {
        reason: 'Customer requested cancellation',
        refundAmount: 0,
        refundPaymentMethod: 'CASH',
        transactionCode: `RF-${Date.now()}`
      }, { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) }) as Observable<ApiResponse<unknown>>)
        .pipe(catchError(() => of(null)))
        .subscribe(() => booking && this.fetchBookings(booking.date));
    }
  }

  checkConflictForEdit(bookingId: number, courtId: number, date: string, startTime: string, endTime: string): ConflictResult {
    const existing = this.bookingsSignal().find(b =>
      b.id !== bookingId &&
      b.courtId === courtId &&
      b.date === date &&
      b.status !== BookingStatus.Cancelled &&
      this.timesOverlap(b.startTime, b.endTime, startTime, endTime)
    );
    return existing
      ? { hasConflict: true, conflictBooking: existing, message: `Sân đã có lịch từ ${existing.startTime} - ${existing.endTime}` }
      : { hasConflict: false, message: 'Lịch trống, có thể đặt sân' };
  }

  updateBookingSchedule(bookingId: number, courtId: number, courtName: string, date: string, startTime: string, endTime: string): void {
    this.bookingsSignal.update(list => list.map(b => b.id === bookingId ? { ...b, courtId, courtName, date, startTime, endTime } : b));
  }

  getBackendBookingId(uiBookingId: number): string | null {
    return this.backendIds.get(uiBookingId) || null;
  }

  private getStaffNameForBooking(bookingId: string, employeeId?: string): string {
    const staffs = this.authService.getAllStaff();
    if (employeeId) {
      const match = staffs.find(s => s.id === employeeId);
      if (match) return match.name;
    }
    if (staffs.length > 0) {
      const hash = bookingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return staffs[hash % staffs.length].name;
    }
    const current = this.authService.currentUser();
    return current ? current.name : 'Nguyễn Văn A';
  }

  private optimisticBooking(data: CreateUiBookingData): Booking {
    return {
      id: this.nextId++,
      code: this.generateBookingCode(),
      ...data,
      status: BookingStatus.Deposited,
      createdAt: new Date().toISOString()
    };
  }

  private toUiBooking(item: BackendScheduleBooking): Booking {
    const uiCourtId = this.courtApi.getUiCourtId(item.courtId) || this.nextId;
    const existingId = [...this.backendIds.entries()].find(([, backendId]) => backendId === item.bookingId)?.[0];
    const id = existingId || this.nextId++;
    this.backendIds.set(id, item.bookingId);

    const uiCustomerId = item.customerId ? (this.customerService.getAllCustomers().find(c => c.backendId === item.customerId)?.id || 0) : 0;
    const court = this.courtApi.courts().find(c => c.id === uiCourtId);
    const courtType = court?.type || 'standard';
    const startTimeStr = item.startTime.slice(11, 16);
    const endTimeStr = item.endTime.slice(11, 16);
    
    // Use the backend courtAmount if available and positive, otherwise calculate scheduled amount
    const calc = this.pricingService.calculatePrice(courtType, startTimeStr, endTimeStr, false);
    const totalAmount = (item.courtAmount && item.courtAmount > 0) ? item.courtAmount : (calc ? calc.totalAmount : 0);

    return {
      id,
      code: item.bookingCode,
      courtId: uiCourtId,
      courtName: item.courtCode,
      customerId: uiCustomerId,
      customerName: item.customerName || item.bookingCode,
      customerPhone: item.customerPhone || '',
      date: item.startTime.slice(0, 10),
      startTime: startTimeStr,
      endTime: endTimeStr,
      status: this.toUiStatus(item.status),
      deposit: item.depositAmount || 0,
      totalAmount,
      overtimeAmount: item.overtimeAmount || 0,
      checkoutAmount: item.finalAmount || 0,
      checkoutTime: item.actualEndTime ? item.actualEndTime.slice(11, 16) : undefined,
      paymentMethod: PaymentMethod.Cash,
      note: '',
      staffName: this.getStaffNameForBooking(item.bookingId),
      createdAt: item.startTime,
      isBlacklistOverride: false,
      additionalServices: (item.serviceItems && item.serviceItems.length > 0)
        ? item.serviceItems.map(s => ({
            name: s.name,
            price: s.unitPrice,
            quantity: s.quantity
          }))
        : (item.serviceAmount && item.serviceAmount > 0)
          ? [{ name: 'Dịch vụ phụ trợ', price: item.serviceAmount, quantity: 1 }]
          : []
    };
  }

  private replaceBooking(id: number, booking: Booking): void {
    this.bookingsSignal.update(list => list.map(item => item.id === id ? booking : item));
  }

  private updateStatus(id: number, status: BookingStatus): void {
    this.bookingsSignal.update(list => list.map(item => item.id === id ? { ...item, status } : item));
  }

  private toUiStatus(status: string): BookingStatus {
    switch (status) {
      case 'DEPOSITED':
      case 'PENDING_DEPOSIT':
        return BookingStatus.Deposited;
      case 'PLAYING':
        return BookingStatus.Playing;
      case 'COMPLETED':
        return BookingStatus.Completed;
      case 'CANCELLED':
      case 'NO_SHOW':
        return BookingStatus.Cancelled;
      default:
        return BookingStatus.Deposited;
    }
  }

  private toBackendPaymentMethod(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.BankTransfer:
        return 'BANK_TRANSFER';
      case PaymentMethod.MomoQR:
        return 'QR_CODE';
      case PaymentMethod.Cash:
      default:
        return 'CASH';
    }
  }

  private timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMin(aStart) < toMin(bEnd) && toMin(bStart) < toMin(aEnd);
  }

  private addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }
}

interface CreateUiBookingData {
  courtId: number;
  courtName: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  deposit: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  note: string;
  staffName: string;
  isBlacklistOverride: boolean;
}
