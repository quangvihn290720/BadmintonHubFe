import { Injectable, signal } from '@angular/core';
import { CourtType, PaymentMethod } from '../models';

export interface BookingFormState {
  date: string;
  courtType: CourtType;
  courtId: number | null;
  courtName: string;
  startTime: string;
  endTime: string;
  customerPhone: string;
  customerName: string;
  customerId: number | null;
  note: string;
  isBlacklisted: boolean;
  blacklistReason: string;
  isBlacklistOverride: boolean;
  totalAmount: number;
  deposit: number;
  paymentMethod: PaymentMethod;
}

@Injectable({ providedIn: 'root' })
export class BookingStateService {
  private readonly stateSignal = signal<Partial<BookingFormState>>({});
  private readonly lastCreatedBookingCodeSignal = signal<string>('');

  readonly state = this.stateSignal.asReadonly();
  readonly lastCreatedBookingCode = this.lastCreatedBookingCodeSignal.asReadonly();

  setPartial(data: Partial<BookingFormState>): void {
    this.stateSignal.update(s => ({ ...s, ...data }));
  }

  getState(): Partial<BookingFormState> {
    return this.stateSignal();
  }

  clear(): void {
    this.stateSignal.set({});
  }

  setLastCreatedBookingCode(code: string): void {
    this.lastCreatedBookingCodeSignal.set(code);
  }

  getLastCreatedBookingCode(): string {
    return this.lastCreatedBookingCodeSignal();
  }
}
