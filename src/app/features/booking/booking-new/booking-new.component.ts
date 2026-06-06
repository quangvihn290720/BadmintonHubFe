import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { BookingStateService } from '../../../core/services/booking-state.service';
import { MockBookingService, ConflictResult } from '../../../core/services/mock-booking.service';
import { MockCustomerService } from '../../../core/services/mock-customer.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Court, Customer } from '../../../core/models';
import { CourtApiService } from '../../../core/services/court-api.service';

interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-booking-new',
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './booking-new.component.html',
  styleUrl: './booking-new.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingNewComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly bookingState = inject(BookingStateService);
  private readonly bookingService = inject(MockBookingService);
  private readonly customerService = inject(MockCustomerService);
  private readonly courtApi = inject(CourtApiService);

  readonly bookingForm = this.fb.group({
    date: ['', [Validators.required]],
    courtType: ['', [Validators.required]],
    courtId: ['', [Validators.required]],
    startTime: ['', [Validators.required]],
    endTime: ['', [Validators.required]],
    customerPhone: ['', [Validators.required, Validators.pattern(/^0[0-9]{9}$/)]],
    customerName: ['', [Validators.required]],
    note: ['']
  });

  allCourts: Court[] = [];
  readonly filteredCourts = signal<Court[]>([]);
  readonly timeSlots = signal<TimeSlot[]>([]);
  readonly endTimeSlots = signal<TimeSlot[]>([]);

  readonly isChecking = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);
  readonly checkResult = signal<ConflictResult | null>(null);
  readonly foundCustomer = signal<Customer | null>(null);
  readonly isBlacklisted = signal<boolean>(false);
  readonly showRefuseDialog = signal<boolean>(false);
  readonly showResultModal = signal<boolean>(false);

  readonly refuseDialogActions = [{
    label: 'Xác nhận từ chối',
    type: 'danger' as const,
    handler: () => {
      this.showRefuseDialog.set(false);
      this.checkResult.set(null);
      this.bookingForm.reset();
      this.submitted.set(false);
    }
  }];

  constructor() {
    this.generate15MinSlots();

    // Auto lookup for customer name when phone is typed/changed
    this.bookingForm.controls.customerPhone.valueChanges
      .pipe(
        takeUntilDestroyed(),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(phone => {
          if (phone && phone.length >= 10) {
            this.isChecking.set(true);
            return this.customerService.findByPhoneBackend(phone);
          } else {
            return of(null);
          }
        })
      )
      .subscribe(customer => {
        this.isChecking.set(false);
        if (customer) {
          this.foundCustomer.set(customer);
          this.isBlacklisted.set(customer.isBlacklisted);
          this.bookingForm.patchValue({ customerName: customer.name }, { emitEvent: false });
        } else {
          this.foundCustomer.set(null);
          this.isBlacklisted.set(false);
        }
      });

    // Auto filter end times when start time is selected
    this.bookingForm.controls.startTime.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(startVal => {
        if (startVal) {
          this.filterEndTimeSlots(startVal);
        }
      });
  }

  ngOnInit(): void {
    this.courtApi.loadCourts().subscribe(courts => {
      if (courts.length) {
        this.allCourts = courts;
        this.onCourtTypeChange();
      }
    });

    const state = this.bookingState.state();
    const today = new Date().toISOString().split('T')[0];
    
    this.bookingForm.patchValue({
      date: state.date || today,
      courtType: state.courtType || '',
      courtId: state.courtId?.toString() || '',
      startTime: state.startTime || '',
      endTime: state.endTime || '',
      customerPhone: state.customerPhone || '',
      customerName: state.customerName || '',
      note: state.note || ''
    });

    if (state.customerPhone) {
      const r = this.customerService.isBlacklisted(state.customerPhone);
      if (r.customer) {
        this.foundCustomer.set(r.customer);
        this.isBlacklisted.set(r.isBlacklisted);
      }
    }

    if (state.startTime) {
      this.filterEndTimeSlots(state.startTime);
    }

    if (state.courtType) {
      this.onCourtTypeChange();
    }
  }

  filterEndTimeSlots(startTime: string): void {
    const [sh, sm] = startTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const filtered = this.timeSlots().filter(s => {
      const [eh, em] = s.endTime.split(':').map(Number);
      return (eh * 60 + em) > startMin;
    });
    this.endTimeSlots.set(filtered);
  }

  generate15MinSlots(): void {
    const slots: TimeSlot[] = [];
    const startMin = 6 * 60; // 06:00
    const endMin = 22 * 60;  // 22:00
    for (let m = startMin; m <= endMin; m += 15) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const str = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      slots.push({ id: m, startTime: str, endTime: str });
    }
    this.timeSlots.set(slots);
    this.endTimeSlots.set([...slots].slice(1));
  }

  showError(field: 'date' | 'courtType' | 'courtId' | 'startTime' | 'endTime' | 'customerPhone' | 'customerName'): boolean {
    let c;
    switch (field) {
      case 'date':
        c = this.bookingForm.controls.date;
        break;
      case 'courtType':
        c = this.bookingForm.controls.courtType;
        break;
      case 'courtId':
        c = this.bookingForm.controls.courtId;
        break;
      case 'startTime':
        c = this.bookingForm.controls.startTime;
        break;
      case 'endTime':
        c = this.bookingForm.controls.endTime;
        break;
      case 'customerPhone':
        c = this.bookingForm.controls.customerPhone;
        break;
      case 'customerName':
        c = this.bookingForm.controls.customerName;
        break;
    }
    return !!(this.submitted() && c && c.invalid);
  }

  onCourtTypeChange(): void {
    const t = this.bookingForm.controls.courtType.value;
    const courts = t ? this.allCourts.filter(c => c.type === t) : this.allCourts;
    this.filteredCourts.set(courts);
  }

  getCourtName(): string {
    const id = Number(this.bookingForm.controls.courtId.value);
    return this.allCourts.find(c => c.id === id)?.name || '';
  }

  onCheckAvailability(): void {
    this.submitted.set(true);
    this.checkResult.set(null);
    this.foundCustomer.set(null);
    this.isBlacklisted.set(false);
    if (this.bookingForm.invalid) return;

    this.isChecking.set(true);
    const f = this.bookingForm.getRawValue();

    // Past date/time checks
    const todayStr = new Date().toISOString().split('T')[0];
    if (f.date < todayStr) {
      this.checkResult.set({ hasConflict: true, message: 'Lỗi: Không thể đặt sân trong quá khứ! Vui lòng chọn ngày hôm nay hoặc tương lai.' });
      this.showResultModal.set(true);
      this.isChecking.set(false);
      return;
    }
    
    if (f.date === todayStr) {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const [sh, sm] = f.startTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      if (startMin < currentMin) {
        this.checkResult.set({ hasConflict: true, message: 'Lỗi: Giờ bắt đầu đã trôi qua! Vui lòng chọn khung giờ hiện tại hoặc tương lai.' });
        this.showResultModal.set(true);
        this.isChecking.set(false);
        return;
      }
    }

    setTimeout(() => {
      const res = this.bookingService.checkConflict(Number(f.courtId), f.date, f.startTime, f.endTime);
      this.checkResult.set(res);
      this.showResultModal.set(true);
      
      if (!res.hasConflict) {
        const r = this.customerService.isBlacklisted(f.customerPhone);
        if (r.customer) {
          this.foundCustomer.set(r.customer);
          this.bookingForm.patchValue({ customerName: r.customer.name }, { emitEvent: false });
        } else {
          this.foundCustomer.set(null);
        }
        this.isBlacklisted.set(r.isBlacklisted);
      }
      this.isChecking.set(false);
    }, 600);
  }

  closeResultModal(): void {
    this.showResultModal.set(false);
  }

  onContinue(): void {
    const f = this.bookingForm.getRawValue();
    let customer = this.foundCustomer();
    if (!customer && f.customerPhone && f.customerName) {
      this.isChecking.set(true);
      this.customerService.addCustomerAsync({
        name: f.customerName,
        phone: f.customerPhone,
        email: `${f.customerPhone.replace(/\s+/g, '')}@badmintonhub.com`
      }).subscribe(savedCustomer => {
        this.isChecking.set(false);
        this.foundCustomer.set(savedCustomer);
        this.navigateToConfirm(savedCustomer, f);
      });
    } else {
      this.navigateToConfirm(customer, f);
    }
  }

  private navigateToConfirm(customer: Customer | null, f: any): void {
    const court = this.allCourts.find(c => c.id === Number(f.courtId));
    this.bookingState.setPartial({
      date: f.date,
      courtType: f.courtType as any,
      courtId: Number(f.courtId),
      courtName: court?.name || '',
      startTime: f.startTime,
      endTime: f.endTime,
      customerPhone: f.customerPhone,
      customerName: f.customerName,
      customerId: customer?.id || null,
      note: f.note,
      isBlacklisted: false,
      blacklistReason: '',
      isBlacklistOverride: false
    });
    this.router.navigate(['/booking/confirm']);
  }

  onRefuseService(): void {
    this.showRefuseDialog.set(true);
  }

  onContinueBlacklist(): void {
    const f = this.bookingForm.getRawValue();
    let customer = this.foundCustomer();
    if (!customer && f.customerPhone && f.customerName) {
      this.isChecking.set(true);
      this.customerService.addCustomerAsync({
        name: f.customerName,
        phone: f.customerPhone,
        email: `${f.customerPhone.replace(/\s+/g, '')}@badmintonhub.com`
      }).subscribe(savedCustomer => {
        this.isChecking.set(false);
        this.foundCustomer.set(savedCustomer);
        this.navigateToConfirmBlacklist(savedCustomer, f);
      });
    } else {
      this.navigateToConfirmBlacklist(customer, f);
    }
  }

  private navigateToConfirmBlacklist(customer: Customer | null, f: any): void {
    const court = this.allCourts.find(c => c.id === Number(f.courtId));
    this.bookingState.setPartial({
      date: f.date,
      courtType: f.courtType as any,
      courtId: Number(f.courtId),
      courtName: court?.name || '',
      startTime: f.startTime,
      endTime: f.endTime,
      customerPhone: f.customerPhone,
      customerName: f.customerName,
      customerId: customer?.id || null,
      note: f.note,
      isBlacklisted: true,
      blacklistReason: customer?.blacklistReason || '',
      isBlacklistOverride: true
    });
    this.router.navigate(['/booking/confirm']);
  }
}
