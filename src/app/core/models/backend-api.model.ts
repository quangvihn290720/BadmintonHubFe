export type Uuid = string;

export interface LoaiSanApi {
  id: Uuid;
  kyHieuSoSan?: string;
  giaCoBanTheoGio?: number;
  viTriText?: string;
  trangThaiVanHanh?: 'SAN_SONG' | 'BAO_TRI_LUOI' | string;
  code?: string;
  basePricePerHour?: number;
  locationNote?: string;
  status?: string;
}

export interface DichVuApi {
  id: Uuid;
  tenDichVu?: string;
  loaiDichVu?: 'NUOC' | 'THUE_VOT' | 'DAN_LUOI' | 'BAN_CAU' | string;
  giaBan?: number;
  tonKho?: number;
  name?: string;
  type?: string;
  price?: number;
  stockQuantity?: number;
  trangThai?: string;
  status?: string;
}

export interface KhuyenMaiApi {
  id: Uuid;
  maCode?: string;
  loaiGiamGia?: 'PERCENT' | 'FIXED_AMOUNT' | string;
  giaTriGiam?: number;
  soLuongConLai?: number;
  hanSuDung?: string;
  code?: string;
  discountValue?: number;
  remainingQuantity?: number;
  expiredAt?: string;
  trangThai?: string;
  status?: string;
}

export interface ChiTietDichVuApi {
  dichVuId?: Uuid;
  tenDichVu?: string;
  soLuong?: number;
  donGia?: number;
  thanhTien?: number;
  name?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface LichDatScheduleApi {
  lichDatId?: Uuid;
  maBooking?: string;
  loaiSanId?: Uuid;
  kyHieuSoSan?: string;
  gioBatDau?: string;
  gioKetThuc?: string;
  trangThai: string;
  tienDaCoc?: number;
  khachHangId?: Uuid;
  tenKhachHang?: string;
  soDienThoaiKhachHang?: string;
  gioKetThucThucTe?: string | null;
  tongTienSan?: number;
  phuThuLoGio?: number;
  tongTienDichVu?: number;
  giamGia?: number;
  tongThanhToan?: number;
  chiTietDichVus?: ChiTietDichVuApi[];
  bookingId?: Uuid;
  bookingCode?: string;
  courtId?: Uuid;
  courtCode?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  depositAmount?: number;
  customerId?: Uuid;
  customerName?: string;
  customerPhone?: string;
  actualEndTime?: string | null;
  courtAmount?: number;
  overtimeAmount?: number;
  serviceAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  serviceItems?: ChiTietDichVuApi[];
}

export interface CreateLichDatRequest {
  khachhangId?: Uuid | null;
  nhanvienId?: Uuid;
  loaisanId: Uuid;
  startTime: string;
  endTime: string;
  depositAmount: number;
  depositPhuongThuc: string;
  depositTransactionCode?: string;
  customerId?: Uuid | null;
  employeeId?: Uuid;
  courtId?: Uuid;
  depositPaymentMethod?: string;
}

export interface CreateLichDatResponse {
  lichdatId?: Uuid;
  lichdatCode?: string;
  status: string;
  bookingId?: Uuid;
  bookingCode?: string;
}

export interface BaoCaoDoanhThuNgayApi {
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

export interface KhachHangApi {
  id: Uuid;
  ten?: string;
  soDienThoai?: string;
  email: string | null;
  trangThai?: string;
  totalBookings?: number;
  fullName?: string;
  phoneNumber?: string;
  status?: string;
  totalLichDats?: number;
  createdAt?: string;
  blacklistReason?: string | null;
}

export interface NhanVienApi {
  id: Uuid;
  ten?: string;
  username: string;
  vaiTro?: 'ADMIN' | 'QUAN_LY' | 'THU_NGAN' | string;
  trangThai?: string;
  fullName?: string;
  role?: 'ADMIN' | 'QUAN_LY' | 'THU_NGAN' | 'MANAGER' | 'CASHIER' | string;
  status?: string;
}

export interface KhungGioApi {
  id: Uuid;
  gioBatDau?: string;
  gioKetThuc?: string;
  heSoGia?: number;
  name?: string;
  startTime?: string;
  endTime?: string;
  multiplier?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  status?: string;
}

export interface CheckOutLichDatResponse {
  lichdatId?: Uuid;
  lichdatCode?: string;
  status: string;
  loaisanAmount?: number;
  overtimeAmount?: number;
  serviceAmount?: number;
  discountAmount?: number;
  depositAmount?: number;
  finalAmount?: number;
  thanhtoanId?: Uuid | null;
}

export interface ThanhToanApi {
  id: Uuid;
  thanhtoanType?: string;
  thanhtoanMethod?: string;
  amount?: number;
  status?: string;
  paidAt?: string;
}

export interface LichDatDetailApi extends LichDatScheduleApi {
  id?: Uuid;
  nhanvienId?: Uuid;
  khuyenmaiId?: Uuid | null;
  cancelledReason?: string | null;
  thanhtoans?: ThanhToanApi[];
}

// Compatibility aliases while the UI layer finishes migrating.
export type BackendCourt = LoaiSanApi;
export type BackendServiceItem = DichVuApi;
export type BackendPromotion = KhuyenMaiApi;
export type BackendScheduleBookingServiceItem = ChiTietDichVuApi;
export type BackendScheduleBooking = LichDatScheduleApi;
export type CreateBookingRequest = CreateLichDatRequest;
export type CreateBookingResponse = CreateLichDatResponse;
export type DailyRevenueReport = BaoCaoDoanhThuNgayApi;
export type BackendCustomer = KhachHangApi;
export type BackendEmployee = NhanVienApi;
export type BackendPriceRule = KhungGioApi;
