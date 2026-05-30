import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PricingService } from '../../core/services/pricing.service';
import { AuthService } from '../../core/services/auth.service';
import { PricingRule } from '../../core/models';

@Component({
  selector: 'app-pricing',
  imports: [ReactiveFormsModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PricingComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly pricingService = inject(PricingService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = computed(() => this.authService.currentUser()?.role === 'admin');

  readonly standardRules = computed(() => {
    return this.pricingService.rules().filter(r => r.courtType === 'standard');
  });

  readonly vipRules = computed(() => {
    return this.pricingService.rules().filter(r => r.courtType === 'vip');
  });
  
  readonly showModal = signal<boolean>(false);
  readonly selectedRule = signal<PricingRule | null>(null);
  readonly submitted = signal<boolean>(false);

  readonly pricingForm = this.fb.group({
    pricePerHour: [0, [Validators.required, Validators.min(0)]],
    isPeak: [false],
    peakSurcharge: [0, [Validators.min(0)]],
    discount: [0, [Validators.min(0), Validators.max(100)]]
  });

  formatCurrency(amount: number): string {
    return this.pricingService.formatCurrency(amount);
  }

  openEditModal(rule: PricingRule): void {
    this.selectedRule.set(rule);
    this.submitted.set(false);
    this.pricingForm.setValue({
      pricePerHour: rule.pricePerHour,
      isPeak: rule.isPeak,
      peakSurcharge: rule.peakSurcharge,
      discount: rule.discount
    });
    this.showModal.set(true);
  }

  showError(field: 'pricePerHour' | 'peakSurcharge' | 'discount'): boolean {
    let c;
    switch (field) {
      case 'pricePerHour':
        c = this.pricingForm.controls.pricePerHour;
        break;
      case 'peakSurcharge':
        c = this.pricingForm.controls.peakSurcharge;
        break;
      case 'discount':
        c = this.pricingForm.controls.discount;
        break;
    }
    return !!(this.submitted() && c && c.invalid);
  }

  onSubmit(): void {
    this.submitted.set(true);
    const rule = this.selectedRule();
    if (this.pricingForm.invalid || !rule) return;

    const data = this.pricingForm.getRawValue();
    const updatedRule: PricingRule = {
      ...rule,
      pricePerHour: data.pricePerHour,
      isPeak: data.isPeak,
      peakSurcharge: data.isPeak ? data.peakSurcharge : 0,
      discount: data.discount
    };

    this.pricingService.updateRule(updatedRule);
    this.showModal.set(false);
  }
}

