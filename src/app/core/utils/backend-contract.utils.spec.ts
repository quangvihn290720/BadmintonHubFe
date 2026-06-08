import { describe, expect, it } from 'vitest';
import { getFriendlyErrorMessage } from '../constants/error-messages';
import {
  hasAdminAccessRole,
  normalizeCourtStatusForApi,
  normalizeDailyRevenueReport,
  normalizeScheduleBooking,
  normalizeServiceItemTypeForApi
} from './backend-contract.utils';

describe('backend-contract utils', () => {
  it('normalizes backend schedule booking field names', () => {
    expect(normalizeScheduleBooking({
      lichdatId: '11111111-1111-1111-1111-111111111111',
      lichdatCode: 'BK-20260608-001',
      loaisanId: '22222222-2222-2222-2222-222222222222',
      loaisanCode: 'SAN-01',
      startTime: '2026-06-08T18:00:00',
      endTime: '2026-06-08T20:00:00',
      status: 'DANG_CHOI',
      depositAmount: 50000,
      loaisanAmount: 200000,
      serviceAmount: 30000,
      overtimeAmount: 0,
      finalAmount: 180000,
      dichVus: [{ dichVuId: 'abc', name: 'Nuoc suoi', quantity: 2, unitPrice: 15000, lineTotal: 30000 }]
    })).toMatchObject({
      lichDatId: '11111111-1111-1111-1111-111111111111',
      maBooking: 'BK-20260608-001',
      tongTienSan: 200000,
      tongTienDichVu: 30000,
      tongThanhToan: 180000
    });
  });

  it('maps UI court statuses to backend domain statuses', () => {
    expect(normalizeCourtStatusForApi('AVAILABLE')).toBe('SAN_SONG');
    expect(normalizeCourtStatusForApi('MAINTENANCE')).toBe('BAO_TRI_LUOI');
    expect(normalizeCourtStatusForApi('SAN_SONG')).toBe('SAN_SONG');
    expect(normalizeCourtStatusForApi('BAO_TRI_LUOI')).toBe('BAO_TRI_LUOI');
  });

  it('maps legacy service item types to backend domain types', () => {
    expect(normalizeServiceItemTypeForApi('DRINK')).toBe('NUOC');
    expect(normalizeServiceItemTypeForApi('RENT_RACKET')).toBe('THUE_VOT');
    expect(normalizeServiceItemTypeForApi('STRINGING')).toBe('DAN_LUOI');
    expect(normalizeServiceItemTypeForApi('SHUTTLECOCK')).toBe('BAN_CAU');
  });

  it('normalizes daily revenue responses from backend field names', () => {
    expect(normalizeDailyRevenueReport({
      date: '2026-06-08',
      totalLoaiSanAmount: 150000,
      totalServiceAmount: 30000,
      totalDepositAmount: 50000,
      totalFinalThanhToanAmount: 130000,
      totalRefundAmount: 0,
      totalDiscountAmount: 10000,
      netRevenue: 180000,
      completedLichDatCount: 4,
      cancelledLichDatCount: 1,
      dichVuRevenue: 30000,
      thanhtoanBreakdownByMethod: {
        TIEN_MAT: 80000,
        CHUYEN_KHOAN: 100000
      }
    })).toEqual({
      date: '2026-06-08',
      totalCourtAmount: 150000,
      totalServiceAmount: 30000,
      totalDiscountAmount: 10000,
      totalDepositAmount: 50000,
      totalFinalPaymentAmount: 130000,
      totalRefundAmount: 0,
      netRevenue: 180000,
      completedBookingCount: 4,
      cancelledBookingCount: 1,
      serviceItemRevenue: 30000,
      paymentBreakdownByMethod: {
        TIEN_MAT: 80000,
        CHUYEN_KHOAN: 100000
      }
    });
  });

  it('accepts backend management role names', () => {
    expect(hasAdminAccessRole('ADMIN')).toBe(true);
    expect(hasAdminAccessRole('QUAN_LY')).toBe(true);
    expect(hasAdminAccessRole('MANAGER')).toBe(true);
    expect(hasAdminAccessRole('THU_NGAN')).toBe(false);
  });

  it('translates backend error codes to Vietnamese messages', () => {
    expect(getFriendlyErrorMessage('COURT_UNSAN_SONG')).toBe('Sân không khả dụng trong khung giờ này.');
    expect(getFriendlyErrorMessage('CUSTOMER_BLACKLIST')).toBe('Khách hàng nằm trong danh sách đen.');
    expect(getFriendlyErrorMessage('PROMOTION_NOT_SAN_SONG')).toBe('Khuyến mãi không khả dụng.');
  });
});
