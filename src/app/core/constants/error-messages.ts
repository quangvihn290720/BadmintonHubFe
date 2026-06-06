export const ERROR_MESSAGES: Record<string, string> = {
  // Error codes
  'UNAUTHORIZED': 'Tên đăng nhập hoặc mật khẩu không chính xác hoặc phiên làm việc đã hết hạn.',
  'FORBIDDEN': 'Bạn không có quyền thực hiện chức năng này.',
  'RESOURCE_NOT_FOUND': 'Không tìm thấy tài nguyên yêu cầu.',
  'VALIDATION_ERROR': 'Dữ liệu không hợp lệ.',
  'INTERNAL_ERROR': 'Lỗi máy chủ hệ thống.',
  'BOOKING_TIME_CONFLICT': 'Thời gian đặt sân bị trùng lặp.',
  'COURT_UNAVAILABLE': 'Sân không khả dụng trong khung giờ này.',
  'CUSTOMER_BLACKLISTED': 'Khách hàng nằm trong danh sách đen.',
  'INSUFFICIENT_STOCK': 'Số lượng trong kho không đủ.',
  'PROMOTION_NOT_AVAILABLE': 'Khuyến mãi không khả dụng.',

  // Specific English messages from backend
  'Invalid credentials': 'Tên đăng nhập hoặc mật khẩu không chính xác.',
  'Time range must not be null': 'Khung giờ không được để trống.',
  'Start time must be before end time': 'Giờ bắt đầu phải trước giờ kết thúc.',
  'Amount must not be null': 'Số tiền không được để trống.',
  'Amount must not be negative': 'Số tiền không được âm.',
  'Multiplier must not be negative': 'Hệ số nhân không được âm.',
  'Service item name must not be blank': 'Tên sản phẩm/dịch vụ không được để trống.',
  'Stock quantity must not be negative': 'Số lượng tồn kho không được âm.',
  'Promotion code must not be blank': 'Mã khuyến mãi không được để trống.',
  'Remaining quantity must not be negative': 'Số lượng còn lại không được âm.',
  'Payment amount must be positive': 'Số tiền thanh toán phải lớn hơn 0.',
  'Quantity must be positive': 'Số lượng phải lớn hơn 0.',
  'Booking is already cancelled': 'Đơn đặt sân đã bị hủy trước đó.',
  'Playing booking cannot be cancelled': 'Không thể hủy đơn đặt sân đang chơi.',
  'Booking code must not be blank': 'Mã đơn đặt sân không được để trống.',
  'Booking not found': 'Không tìm thấy đơn đặt sân.',
};

export function getFriendlyErrorMessage(code?: string, defaultMessage?: string): string {
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  if (defaultMessage && ERROR_MESSAGES[defaultMessage]) {
    return ERROR_MESSAGES[defaultMessage];
  }
  // Fallbacks and pattern checks
  if (defaultMessage) {
    if (defaultMessage.includes('Invalid credentials')) {
      return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
    }
    return defaultMessage;
  }
  return 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
}
