import type { ChiTietDichVuApi, DailyRevenueReport, LichDatScheduleApi } from '../models/backend-api.model';

export type BackendCourtStatus = 'SAN_SONG' | 'BAO_TRI_LUOI';
export type BackendServiceItemType = 'NUOC' | 'THUE_VOT' | 'DAN_LUOI' | 'BAN_CAU';

export interface BackendDailyRevenueReportResponse {
  date: string;
  totalLoaiSanAmount?: number;
  totalServiceAmount?: number;
  totalDepositAmount?: number;
  totalFinalThanhToanAmount?: number;
  totalRefundAmount?: number;
  totalDiscountAmount?: number;
  netRevenue?: number;
  completedLichDatCount?: number;
  cancelledLichDatCount?: number;
  dichVuRevenue?: number;
  thanhtoanBreakdownByMethod?: Record<string, number>;
}

/** Maps backend schedule/detail JSON (lichdatId, loaisanAmount, dichVus) to UI-friendly aliases. */
export function normalizeScheduleBooking(raw: Record<string, unknown>): LichDatScheduleApi {
  const dichVusRaw = (raw['dichVus'] ?? raw['chiTietDichVus'] ?? raw['serviceItems'] ?? []) as Record<string, unknown>[];
  const dichVus: ChiTietDichVuApi[] = dichVusRaw.map(item => ({
    dichVuId: String(item['dichVuId'] ?? item['dich_vu_id'] ?? item['serviceItemId'] ?? ''),
    tenDichVu: String(item['name'] ?? item['tenDichVu'] ?? ''),
    soLuong: Number(item['quantity'] ?? item['soLuong'] ?? 0),
    donGia: Number(item['unitPrice'] ?? item['donGia'] ?? 0),
    thanhTien: Number(item['lineTotal'] ?? item['thanhTien'] ?? 0)
  }));

  return {
    lichDatId: String(raw['lichdatId'] ?? raw['lichDatId'] ?? raw['bookingId'] ?? raw['id'] ?? ''),
    maBooking: String(raw['lichdatCode'] ?? raw['maBooking'] ?? raw['bookingCode'] ?? ''),
    loaiSanId: String(raw['loaisanId'] ?? raw['loaiSanId'] ?? raw['courtId'] ?? ''),
    kyHieuSoSan: String(raw['loaisanCode'] ?? raw['kyHieuSoSan'] ?? raw['courtCode'] ?? ''),
    gioBatDau: String(raw['startTime'] ?? raw['gioBatDau'] ?? ''),
    gioKetThuc: String(raw['endTime'] ?? raw['gioKetThuc'] ?? ''),
    trangThai: String(raw['status'] ?? raw['trangThai'] ?? 'DA_COC'),
    tienDaCoc: Number(raw['depositAmount'] ?? raw['tienDaCoc'] ?? 0),
    khachHangId: raw['khachhangId'] != null ? String(raw['khachhangId']) : raw['khachHangId'] != null ? String(raw['khachHangId']) : undefined,
    tenKhachHang: String(raw['khachhangName'] ?? raw['tenKhachHang'] ?? raw['customerName'] ?? ''),
    soDienThoaiKhachHang: String(raw['khachhangPhone'] ?? raw['soDienThoaiKhachHang'] ?? raw['customerPhone'] ?? ''),
    gioKetThucThucTe: raw['actualEndTime'] != null ? String(raw['actualEndTime']) : raw['gioKetThucThucTe'] != null ? String(raw['gioKetThucThucTe']) : null,
    tongTienSan: Number(raw['loaisanAmount'] ?? raw['tongTienSan'] ?? raw['courtAmount'] ?? 0),
    phuThuLoGio: Number(raw['overtimeAmount'] ?? raw['phuThuLoGio'] ?? 0),
    tongTienDichVu: Number(raw['serviceAmount'] ?? raw['tongTienDichVu'] ?? 0),
    giamGia: Number(raw['discountAmount'] ?? raw['giamGia'] ?? 0),
    tongThanhToan: Number(raw['finalAmount'] ?? raw['tongThanhToan'] ?? 0),
    chiTietDichVus: dichVus
  };
}

export function normalizeCourtStatusForApi(status?: string): BackendCourtStatus {
  switch ((status || '').trim().toUpperCase()) {
    case 'BAO_TRI_LUOI':
    case 'MAINTENANCE':
    case 'INACTIVE':
      return 'BAO_TRI_LUOI';
    case 'SAN_SONG':
    case 'AVAILABLE':
    default:
      return 'SAN_SONG';
  }
}

export function courtStatusLabel(status?: string): string {
  return normalizeCourtStatusForApi(status) === 'SAN_SONG' ? 'Sẵn sàng' : 'Bảo trì lưới';
}

export function normalizeServiceItemTypeForApi(type?: string): BackendServiceItemType {
  switch ((type || '').trim().toUpperCase()) {
    case 'THUE_VOT':
    case 'RENT_RACKET':
      return 'THUE_VOT';
    case 'DAN_LUOI':
    case 'STRINGING':
      return 'DAN_LUOI';
    case 'BAN_CAU':
    case 'SHUTTLECOCK':
      return 'BAN_CAU';
    case 'NUOC':
    case 'DRINK':
    default:
      return 'NUOC';
  }
}

export function normalizeDailyRevenueReport(
  report: BackendDailyRevenueReportResponse | DailyRevenueReport | null | undefined
): DailyRevenueReport {
  return {
    date: report?.date || '',
    totalCourtAmount: Number((report as BackendDailyRevenueReportResponse | undefined)?.totalLoaiSanAmount ?? (report as DailyRevenueReport | undefined)?.totalCourtAmount ?? 0),
    totalServiceAmount: Number(report?.totalServiceAmount ?? 0),
    totalDiscountAmount: Number(report?.totalDiscountAmount ?? 0),
    totalDepositAmount: Number(report?.totalDepositAmount ?? 0),
    totalFinalPaymentAmount: Number((report as BackendDailyRevenueReportResponse | undefined)?.totalFinalThanhToanAmount ?? (report as DailyRevenueReport | undefined)?.totalFinalPaymentAmount ?? 0),
    totalRefundAmount: Number(report?.totalRefundAmount ?? 0),
    netRevenue: Number(report?.netRevenue ?? 0),
    completedBookingCount: Number((report as BackendDailyRevenueReportResponse | undefined)?.completedLichDatCount ?? (report as DailyRevenueReport | undefined)?.completedBookingCount ?? 0),
    cancelledBookingCount: Number((report as BackendDailyRevenueReportResponse | undefined)?.cancelledLichDatCount ?? (report as DailyRevenueReport | undefined)?.cancelledBookingCount ?? 0),
    serviceItemRevenue: Number((report as BackendDailyRevenueReportResponse | undefined)?.dichVuRevenue ?? (report as DailyRevenueReport | undefined)?.serviceItemRevenue ?? 0),
    paymentBreakdownByMethod: ((report as BackendDailyRevenueReportResponse | undefined)?.thanhtoanBreakdownByMethod
      ?? (report as DailyRevenueReport | undefined)?.paymentBreakdownByMethod
      ?? {}) as Record<string, number>
  };
}

export function hasAdminAccessRole(role?: string): boolean {
  const normalized = (role || '').trim().toUpperCase();
  return normalized === 'ADMIN' || normalized === 'QUAN_LY' || normalized === 'MANAGER';
}
