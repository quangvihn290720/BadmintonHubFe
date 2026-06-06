export type Uuid = string;

export interface BackendCourt {
  id: Uuid;
  code: string;
  basePricePerHour: number;
  locationNote: string;
  status: 'AVAILABLE' | 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | string;
}

export interface BackendServiceItem {
  id: Uuid;
  name: string;
  type: string;
  price: number;
  stockQuantity: number;
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface BackendPromotion {
  id: Uuid;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | string;
  discountValue: number;
  remainingQuantity: number;
  expiredAt: string;
  status: string;
}

export interface BackendScheduleBookingServiceItem {
  serviceItemId: Uuid;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BackendScheduleBooking {
  bookingId: Uuid;
  bookingCode: string;
  courtId: Uuid;
  courtCode: string;
  startTime: string;
  endTime: string;
  status: string;
  depositAmount: number;
  customerId?: Uuid;
  customerName?: string;
  customerPhone?: string;

  actualEndTime?: string | null;
  courtAmount?: number;
  overtimeAmount?: number;
  serviceAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  serviceItems?: BackendScheduleBookingServiceItem[];
}

export interface CreateBookingRequest {
  customerId?: Uuid | null;
  employeeId: Uuid;
  courtId: Uuid;
  startTime: string;
  endTime: string;
  depositAmount: number;
  depositPaymentMethod: string;
  depositTransactionCode?: string;
}

export interface CreateBookingResponse {
  bookingId: Uuid;
  bookingCode: string;
  status: string;
}

export interface DailyRevenueReport {
  date: string;
  totalCourtAmount: number;
  totalServiceAmount: number;
  totalDiscountAmount: number;
  totalDepositAmount: number;
  totalFinalPaymentAmount: number;
  totalRefundAmount: number;
  netRevenue: number;
  completedBookingCount: number;
  cancelledBookingCount: number;
  serviceItemRevenue: number;
  paymentBreakdownByMethod: Record<string, number>;
}

export interface BackendCustomer {
  id: Uuid;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  status: string;
  totalBookings: number;
  createdAt: string;
}

export interface BackendEmployee {
  id: Uuid;
  fullName: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | string;
  status: string;
}

export interface BackendPriceRule {
  id: Uuid;
  name: string;
  startTime: string;
  endTime: string;
  multiplier: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
}
