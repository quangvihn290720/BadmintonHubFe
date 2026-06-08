import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import { Booking, BookingStatus, PaymentMethod } from '../models';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import {
  BackendScheduleBooking,
  CheckOutLichDatResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  LichDatDetailApi
} from '../models/backend-api.model';
import { AuthService } from './auth.service';
import { CourtApiService } from './court-api.service';
import { CustomerService } from './customer.service';
import { PricingService } from './pricing.service';
import { normalizeScheduleBooking } from '../utils/backend-contract.utils';

export interface ConflictResult {
  hasConflict: boolean;
  conflictBooking?: Booking;
  message: string;
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

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly courtApi = inject(CourtApiService);
  private readonly customerService = inject(CustomerService);
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
      map(response => (response.data || []).map(item => this.toUiBooking(normalizeScheduleBooking(item as unknown as Record<string, unknown>) as BackendScheduleBooking))),
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
        message: `San da duoc dat tu ${existing.startTime} - ${existing.endTime} (${this.getStatusLabel(existing.status)})`
      };
    }

    return { hasConflict: false, message: 'Lich trong, co the dat san' };
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
    const loaisanId = this.courtApi.getBackendCourtId(data.courtId);
    const session = this.authService.getCurrentSession();

    if (!loaisanId || !session) {
      return of(booking);
    }

    const body: CreateBookingRequest = {
      khachhangId: this.customerService.getBackendCustomerId(data.customerId),
      nhanvienId: session.id,
      loaisanId,
      startTime: `${data.date}T${data.startTime}:00`,
      endTime: `${data.date}T${data.endTime}:00`,
      depositAmount: data.deposit,
      depositPhuongThuc: this.toBackendPaymentMethod(data.paymentMethod),
      depositTransactionCode: `DEP-${Date.now()}`
    };

    const headers = new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
    return (this.http.post(API_ENDPOINTS.BOOKINGS.BASE, body, { headers }) as Observable<ApiResponse<CreateBookingResponse>>).pipe(
      map(response => response.data),
      map(response => ({
        backendId: response.lichdatId || response.bookingId || '',
        booking: {
          ...booking,
          code: response.lichdatCode || response.bookingCode || booking.code,
          status: this.toUiStatus(response.status)
        }
      })),
      tap(saved => {
        if (saved.backendId) {
          this.backendIds.set(saved.booking.id, saved.backendId);
        }
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
  ): Observable<CheckOutLichDatResponse | null> {
    const booking = this.bookingsSignal().find(b => b.id === bookingId);
    const backendId = this.backendIds.get(bookingId);

    if (!backendId || !booking) {
      this.applyLocalCheckout(bookingId, services, overtimeMin, overtimeAmt, checkoutAmt, pm, timeStr);
      return of(null);
    }

    const serviceCalls = services
      .filter(service => service.key && service.quantity > 0)
      .map(service => (this.http.post(API_ENDPOINTS.BOOKINGS.SERVICE_ITEMS(backendId), {
        dichVuId: service.key,
        serviceItemId: service.key,
        quantity: service.quantity,
        note: service.name
      }, { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) }) as Observable<ApiResponse<unknown>>));

    const addServices$: Observable<unknown> = serviceCalls.length ? forkJoin(serviceCalls) : of([]);

    return addServices$.pipe(
      switchMap(() => (this.http.post(API_ENDPOINTS.BOOKINGS.CHECKOUT(backendId), {
        actualEndTime: `${booking.date}T${timeStr}:00`,
        thanhtoanMethod: this.toBackendPaymentMethod(pm),
        paymentMethod: this.toBackendPaymentMethod(pm),
        overtimeAmount: overtimeAmt,
        transactionCode: `FINAL-${Date.now()}`
      }, { headers: new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() }) }) as Observable<ApiResponse<CheckOutLichDatResponse>>)),
      map(response => response.data),
      tap(result => {
        if (result) {
          this.applyCheckoutResult(bookingId, booking, result, services, overtimeMin, overtimeAmt, pm, timeStr);
        }
        this.fetchBookings(booking.date);
      }),
      catchError(err => {
        this.fetchBookings(booking.date);
        return throwError(() => err);
      })
    );
  }

  getLichDatDetail(backendId: string): Observable<LichDatDetailApi | null> {
    return (this.http.get(API_ENDPOINTS.BOOKINGS.DETAIL(backendId)) as Observable<ApiResponse<LichDatDetailApi>>).pipe(
      map(response => response.data ? normalizeScheduleBooking(response.data as unknown as Record<string, unknown>) as LichDatDetailApi : null),
      catchError(() => of(null))
    );
  }

  private applyLocalCheckout(
    bookingId: number,
    services: { key?: string; name: string; price: number; quantity: number }[],
    overtimeMin: number,
    overtimeAmt: number,
    checkoutAmt: number,
    pm: PaymentMethod,
    timeStr: string
  ): void {
    this.bookingsSignal.update(list => list.map(b => b.id === bookingId ? {
      ...b,
      additionalServices: services,
      overtimeMinutes: overtimeMin,
      overtimeAmount: overtimeAmt,
      checkoutAmount: checkoutAmt,
      checkoutPaymentMethod: pm,
      checkoutTime: timeStr,
      status: BookingStatus.Completed
    } : b));
  }

  private applyCheckoutResult(
    bookingId: number,
    booking: Booking,
    result: CheckOutLichDatResponse,
    services: { key?: string; name: string; price: number; quantity: number }[],
    overtimeMin: number,
    overtimeAmt: number,
    pm: PaymentMethod,
    timeStr: string
  ): void {
    this.bookingsSignal.update(list => list.map(b => b.id === bookingId ? {
      ...b,
      code: result.lichdatCode || b.code,
      status: BookingStatus.Completed,
      totalAmount: result.loaisanAmount ?? b.totalAmount,
      overtimeAmount: result.overtimeAmount ?? overtimeAmt,
      overtimeMinutes: overtimeMin,
      checkoutAmount: result.finalAmount ?? 0,
      checkoutTime: timeStr,
      checkoutPaymentMethod: pm,
      additionalServices: services.length > 0 ? services : b.additionalServices,
      deposit: result.depositAmount ?? b.deposit
    } : b));
  }

  getStatusLabel(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Available: return 'Trong';
      case BookingStatus.Deposited: return 'Da coc';
      case BookingStatus.Playing: return 'Dang choi';
      case BookingStatus.Cancelled: return 'Da huy';
      case BookingStatus.Completed: return 'Hoan thanh';
      default: return status;
    }
  }

  getTodayStats(date: string, simulatedTime = '12:00'): { available: number; deposited: number; playing: number; revenue: number } {
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

    return { available: totalCourts - occupiedCourts, deposited, playing, revenue };
  }

  cancelBooking(bookingId: number): void {
    this.updateStatus(bookingId, BookingStatus.Cancelled);
    const booking = this.bookingsSignal().find(b => b.id === bookingId);
    const backendId = this.backendIds.get(bookingId);
    if (backendId) {
      (this.http.post(API_ENDPOINTS.BOOKINGS.CANCEL(backendId), {
        reason: 'Customer requested cancellation',
        refundAmount: 0,
        refundPaymentMethod: 'TIEN_MAT',
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
      ? { hasConflict: true, conflictBooking: existing, message: `San da co lich tu ${existing.startTime} - ${existing.endTime}` }
      : { hasConflict: false, message: 'Lich trong, co the dat san' };
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
    return this.authService.currentUser()?.name || 'Nhan vien';
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
    const normalized = normalizeScheduleBooking(item as unknown as Record<string, unknown>);
    const backendCourtId = normalized.loaiSanId || '';
    const backendBookingId = normalized.lichDatId || '';
    const bookingCode = normalized.maBooking || backendBookingId || this.generateBookingCode();
    const startTime = normalized.gioBatDau || new Date().toISOString();
    const endTime = normalized.gioKetThuc || startTime;
    const uiCourtId = this.courtApi.getUiCourtId(backendCourtId) || this.nextId;
    const existingId = [...this.backendIds.entries()].find(([, id]) => id === backendBookingId)?.[0];
    const id = existingId || this.nextId++;

    if (backendBookingId) {
      this.backendIds.set(id, backendBookingId);
    }

    const customerBackendId = normalized.khachHangId;
    const uiCustomerId = customerBackendId
      ? (this.customerService.getAllCustomers().find(c => c.backendId === customerBackendId)?.id || 0)
      : 0;
    const court = this.courtApi.courts().find(c => c.id === uiCourtId);
    const courtType = court?.type || 'standard';
    const startTimeStr = startTime.slice(11, 16);
    const endTimeStr = endTime.slice(11, 16);
    const calc = this.pricingService.calculatePrice(courtType, startTimeStr, endTimeStr, false);
    const courtAmount = normalized.tongTienSan ?? 0;
    const serviceAmount = normalized.tongTienDichVu ?? 0;
    const overtimeAmount = normalized.phuThuLoGio ?? 0;
    const depositAmount = normalized.tienDaCoc ?? 0;
    const finalAmount = normalized.tongThanhToan ?? 0;
    const serviceItems = normalized.chiTietDichVus || [];

    return {
      id,
      code: bookingCode,
      courtId: uiCourtId,
      courtName: normalized.kyHieuSoSan || this.courtApi.getCourtName(uiCourtId),
      customerId: uiCustomerId,
      customerName: normalized.tenKhachHang || bookingCode,
      customerPhone: normalized.soDienThoaiKhachHang || '',
      date: startTime.slice(0, 10),
      startTime: startTimeStr,
      endTime: endTimeStr,
      status: this.toUiStatus(normalized.trangThai || 'DA_COC'),
      deposit: depositAmount,
      totalAmount: courtAmount > 0 ? courtAmount : calc.totalAmount,
      overtimeAmount,
      checkoutAmount: finalAmount,
      checkoutTime: (normalized.gioKetThucThucTe || '').slice(11, 16) || undefined,
      paymentMethod: PaymentMethod.Cash,
      note: '',
      staffName: this.getStaffNameForBooking(backendBookingId),
      createdAt: startTime,
      isBlacklistOverride: false,
      additionalServices: serviceItems.length > 0
        ? serviceItems.map(service => ({
            name: service.tenDichVu || service.name || 'Dich vu',
            price: service.donGia ?? service.unitPrice ?? 0,
            quantity: service.soLuong ?? service.quantity ?? 0
          }))
        : serviceAmount > 0
          ? [{ name: 'Dich vu phu tro', price: serviceAmount, quantity: 1 }]
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
      case 'DA_COC':
      case 'DEPOSITED':
      case 'PENDING_DEPOSIT':
        return BookingStatus.Deposited;
      case 'DANG_CHOI':
      case 'PLAYING':
        return BookingStatus.Playing;
      case 'HOAN_THANH':
      case 'COMPLETED':
        return BookingStatus.Completed;
      case 'DA_HUY':
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
        return 'CHUYEN_KHOAN';
      case PaymentMethod.MomoQR:
        return 'MOMO';
      case PaymentMethod.Cash:
      default:
        return 'TIEN_MAT';
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
