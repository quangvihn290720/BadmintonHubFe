import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Booking, BookingStatus, PaymentMethod } from '../models';
import { MOCK_BOOKINGS } from '../mock-data';
import { ApiConfigService } from './api-config.service';
import { API_ENDPOINTS } from '../constants/api-endpoints';

export interface ConflictResult {
  hasConflict: boolean;
  conflictBooking?: Booking;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class MockBookingService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  private readonly bookingsSignal = signal<Booking[]>([...MOCK_BOOKINGS]);
  readonly bookings = this.bookingsSignal.asReadonly();
  
  private nextId = MOCK_BOOKINGS.length + 1;

  constructor() {
    this.fetchBookings();
  }

  fetchBookings(): void {
    if (this.apiConfig.isMockMode()) return;

    this.http.get<Booking[]>(API_ENDPOINTS.BOOKINGS.BASE)
      .pipe(
        catchError((err: any) => {
          return of([] as Booking[]);
        })
      )
      .subscribe((list: Booking[]) => {
        if (list && list.length > 0) {
          this.bookingsSignal.set(list);
        }
      });
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
        message: `Sân đã được đặt bởi ${existing.customerName} từ ${existing.startTime} - ${existing.endTime} (${this.getStatusLabel(existing.status)})`
      };
    }

    return { hasConflict: false, message: 'Lịch trống, có thể đặt sân' };
  }

  private timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMin(aStart) < toMin(bEnd) && toMin(bStart) < toMin(aEnd);
  }

  generateBookingCode(): string {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const seq = this.nextId.toString().padStart(3, '0');
    return `BK-${dateStr}-${seq}`;
  }

  createBooking(data: {
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
  }): Booking {
    const booking: Booking = {
      id: this.nextId++,
      code: this.generateBookingCode(),
      ...data,
      status: BookingStatus.Deposited,
      createdAt: new Date().toISOString(),
    };
    
    if (this.apiConfig.isMockMode()) {
      this.bookingsSignal.update(list => [...list, booking]);
    } else {
      this.http.post<Booking>(API_ENDPOINTS.BOOKINGS.BASE, booking)
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          if (res) this.fetchBookings();
        });
      
      // Optimistic update
      this.bookingsSignal.update(list => [...list, booking]);
    }
    
    return booking;
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
    // Optimistic Update
    this.bookingsSignal.update(list => {
      const idx = list.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        const copy = [...list];
        copy[idx] = { ...copy[idx], status: BookingStatus.Playing };
        return copy;
      }
      return list;
    });

    if (!this.apiConfig.isMockMode()) {
      this.http.post<any>(API_ENDPOINTS.BOOKINGS.CHECKIN(bookingId), {})
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.fetchBookings();
        });
    }
  }

  checkOut(
    bookingId: number,
    services: { name: string; price: number; quantity: number }[],
    overtimeMin: number,
    overtimeAmt: number,
    checkoutAmt: number,
    pm: PaymentMethod,
    timeStr: string
  ): void {
    const checkoutPayload = {
      additionalServices: services,
      overtimeMinutes: overtimeMin,
      overtimeAmount: overtimeAmt,
      checkoutAmount: checkoutAmt,
      checkoutPaymentMethod: pm,
      checkoutTime: timeStr,
      status: BookingStatus.Completed
    };

    // Optimistic Update
    this.bookingsSignal.update(list => {
      const idx = list.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        const copy = [...list];
        copy[idx] = {
          ...copy[idx],
          ...checkoutPayload
        };
        return copy;
      }
      return list;
    });

    if (!this.apiConfig.isMockMode()) {
      this.http.post<any>(API_ENDPOINTS.BOOKINGS.CHECKOUT(bookingId), checkoutPayload)
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.fetchBookings();
        });
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
    for (let courtId = 1; courtId <= 8; courtId++) {
      const isOccupied = todayBookings.some(b => 
        b.courtId === courtId &&
        b.status !== BookingStatus.Cancelled &&
        b.status !== BookingStatus.Completed &&
        this.timesOverlap(b.startTime, b.endTime, simulatedTime, this.addMinutes(simulatedTime, 1))
      );
      if (isOccupied) occupiedCourts++;
    }
    const available = 8 - occupiedCourts;

    return { available, deposited, playing, revenue };
  }

  cancelBooking(bookingId: number): void {
    // Optimistic Update
    this.bookingsSignal.update(list => {
      const idx = list.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        const copy = [...list];
        copy[idx] = { ...copy[idx], status: BookingStatus.Cancelled };
        return copy;
      }
      return list;
    });

    if (!this.apiConfig.isMockMode()) {
      this.http.post<any>(API_ENDPOINTS.BOOKINGS.CANCEL(bookingId), {})
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.fetchBookings();
        });
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

    if (existing) {
      return {
        hasConflict: true,
        conflictBooking: existing,
        message: `Sân đã được đặt bởi ${existing.customerName} từ ${existing.startTime} - ${existing.endTime} (${this.getStatusLabel(existing.status)})`
      };
    }

    return { hasConflict: false, message: 'Lịch trống, có thể đặt sân' };
  }

  updateBookingSchedule(
    bookingId: number,
    courtId: number,
    courtName: string,
    date: string,
    startTime: string,
    endTime: string
  ): void {
    const updatePayload = {
      courtId,
      courtName,
      date,
      startTime,
      endTime
    };

    // Optimistic Update
    this.bookingsSignal.update(list => {
      const idx = list.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        const copy = [...list];
        copy[idx] = {
          ...copy[idx],
          ...updatePayload
        };
        return copy;
      }
      return list;
    });

    if (!this.apiConfig.isMockMode()) {
      this.http.post<any>(API_ENDPOINTS.BOOKINGS.RESCHEDULE(bookingId), updatePayload)
        .pipe(
          catchError((err: any) => {
            return of(null);
          })
        )
        .subscribe((res: any) => {
          this.fetchBookings();
        });
    }
  }

  private addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }
}
