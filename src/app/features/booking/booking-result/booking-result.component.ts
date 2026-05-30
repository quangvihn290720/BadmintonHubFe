import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { PricingService } from '../../../core/services/pricing.service';

@Component({
  selector: 'app-booking-result',
  templateUrl: './booking-result.component.html',
  styleUrl: './booking-result.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingResultComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly bookingStateService = inject(BookingStateService);
  private readonly pricingService = inject(PricingService);

  readonly state = this.bookingStateService.state;
  readonly bookingCode = signal<string>('');

  ngOnInit(): void {
    const code = this.bookingStateService.getLastCreatedBookingCode();
    this.bookingCode.set(code);
    if (!code) {
      this.router.navigate(['/dashboard']);
    }
  }

  formatCurrency(amount: number): string {
    return this.pricingService.formatCurrency(amount);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  getPaymentMethodLabel(): string {
    switch (this.state().paymentMethod) {
      case 'cash': return 'Tiền mặt';
      case 'bank_transfer': return 'Chuyển khoản';
      case 'momo_qr': return 'MOMO / QR';
      default: return 'Tiền mặt';
    }
  }

  goToDashboard(): void {
    this.bookingStateService.clear();
    this.router.navigate(['/dashboard']);
  }

  printReceipt(): void {
    window.print();
  }

  newBooking(): void {
    this.bookingStateService.clear();
    this.router.navigate(['/booking/new']);
  }
}

