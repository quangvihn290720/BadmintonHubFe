import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { BookingService } from '../../../core/services/booking.service';
import { PaymentIntentApiService } from '../../../core/services/payment-intent-api.service';
import { switchMap, of } from 'rxjs';
import { PricingService } from '../../../core/services/pricing.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentMethod } from '../../../core/models';

@Component({
  selector: 'app-booking-confirm',
  imports: [ReactiveFormsModule],
  templateUrl: './booking-confirm.component.html',
  styleUrl: './booking-confirm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingConfirmComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly bookingStateService = inject(BookingStateService);
  private readonly bookingService = inject(BookingService);
  private readonly pricingService = inject(PricingService);
  private readonly authService = inject(AuthService);
  private readonly paymentIntentApi = inject(PaymentIntentApiService);

  readonly state = this.bookingStateService.state;
  readonly staffName = signal<string>('');

  readonly paymentForm = this.fb.group({
    paymentMethod: ['cash', [Validators.required]],
    deposit: [0, [Validators.required, Validators.min(1)]]
  });

  readonly isSubmitting = signal<boolean>(false);
  readonly depositError = signal<string>('');
  readonly showQrModal = signal(false);
  readonly qrPayload = signal('');
  readonly pendingIntentId = signal('');
  readonly pendingWebhookSecret = signal('');

  readonly priceCalc = computed(() => {
    const s = this.state();
    if (!s.courtType || !s.startTime || !s.endTime) {
      return null;
    }
    return this.pricingService.calculatePrice(s.courtType, s.startTime, s.endTime, s.isBlacklistOverride || false);
  });

  readonly halfAmount = computed(() => {
    const calc = this.priceCalc();
    return calc ? Math.round(calc.totalAmount * 0.5) : 0;
  });

  ngOnInit(): void {
    const s = this.state();
    if (!s.courtId) {
      this.router.navigate(['/booking/new']);
      return;
    }
    
    this.staffName.set(this.authService.getStaffName());

    const calc = this.priceCalc();
    if (calc) {
      this.paymentForm.patchValue({
        deposit: calc.suggestedDeposit
      });
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

  setDeposit(amount: number): void {
    this.paymentForm.patchValue({ deposit: amount });
    this.depositError.set('');
  }

  goBack(): void {
    this.router.navigate(['/booking/new']);
  }

  onConfirm(): void {
    this.depositError.set('');
    const deposit = this.paymentForm.controls.deposit.value;
    const calc = this.priceCalc();
    if (!calc) return;

    const minDeposit = calc.suggestedDeposit;
    if (!deposit || deposit < minDeposit) {
      const pct = this.state().isBlacklistOverride ? '100%' : '30%';
      this.depositError.set(`Số tiền cọc tối thiểu là ${pct} (${this.formatCurrency(minDeposit)})`);
      return;
    }

    this.isSubmitting.set(true);
    const pmMap: Record<string, PaymentMethod> = {
      'cash': PaymentMethod.Cash,
      'bank_transfer': PaymentMethod.BankTransfer,
      'momo_qr': PaymentMethod.MomoQR
    };

    const s = this.state();
    const methodVal = this.paymentForm.controls.paymentMethod.value;
    const finalMethod = pmMap[methodVal] || PaymentMethod.Cash;

    this.bookingService.createBookingAsync({
      courtId: s.courtId!,
      courtName: s.courtName!,
      customerId: s.customerId || 0,
      customerName: s.customerName!,
      customerPhone: s.customerPhone!,
      date: s.date!,
      startTime: s.startTime!,
      endTime: s.endTime!,
      deposit,
      totalAmount: calc.totalAmount,
      paymentMethod: finalMethod,
      note: s.note || '',
      staffName: this.staffName(),
      isBlacklistOverride: s.isBlacklistOverride || false
    }).pipe(
      switchMap(booking => {
        const backendId = this.bookingService.getBackendBookingId(booking.id);
        const needsQr = finalMethod === PaymentMethod.MomoQR || finalMethod === PaymentMethod.BankTransfer;
        if (backendId && needsQr) {
          return this.paymentIntentApi.createIntent(backendId, deposit).pipe(
            switchMap(intent => of({ booking, intent }))
          );
        }
        return of({ booking, intent: null });
      })
    ).subscribe({
      next: ({ booking, intent }) => {
        this.bookingStateService.setPartial({
          deposit,
          totalAmount: calc.totalAmount,
          paymentMethod: finalMethod
        });
        this.bookingStateService.setLastCreatedBookingCode(booking.code);
        this.isSubmitting.set(false);
        if (intent) {
          this.qrPayload.set(intent.qrPayload);
          this.pendingIntentId.set(intent.id);
          this.pendingWebhookSecret.set(intent.webhookSecret);
          this.showQrModal.set(true);
          return;
        }
        this.router.navigate(['/booking/result']);
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  simulateQrPayment(): void {
    const intentId = this.pendingIntentId();
    const secret = this.pendingWebhookSecret();
    if (!intentId || !secret) {
      this.router.navigate(['/booking/result']);
      return;
    }
    this.paymentIntentApi.confirmMockWebhook(intentId, secret).subscribe({
      next: () => {
        this.showQrModal.set(false);
        this.router.navigate(['/booking/result']);
      },
      error: () => this.router.navigate(['/booking/result'])
    });
  }

  skipQrPayment(): void {
    this.showQrModal.set(false);
    this.router.navigate(['/booking/result']);
  }
}
