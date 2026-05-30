export enum BookingStatus {
  Available = 'available',
  Deposited = 'deposited',
  Playing = 'playing',
  Cancelled = 'cancelled',
  Completed = 'completed'
}

export enum PaymentMethod {
  Cash = 'cash',
  BankTransfer = 'bank_transfer',
  MomoQR = 'momo_qr'
}

export interface Booking {
  id: number;
  code: string;
  courtId: number;
  courtName: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  status: BookingStatus;
  deposit: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  note: string;
  staffName: string;
  createdAt: string;
  isBlacklistOverride: boolean;
  additionalServices?: { name: string; price: number; quantity: number }[];
  overtimeMinutes?: number;
  overtimeAmount?: number;
  checkoutAmount?: number;
  checkoutTime?: string;
  checkoutPaymentMethod?: PaymentMethod;
}
