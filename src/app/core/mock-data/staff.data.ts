export const MOCK_STAFF = [
  { id: 1, name: 'Nhân viên A', username: 'staff',  password: '123456', role: 'staff' },
  { id: 2, name: 'Nhân viên B', username: 'staff2', password: '123456', role: 'staff' },
  { id: 3, name: 'Quản lý',     username: 'admin',  password: 'admin123', role: 'admin' },
];

export interface PaymentRecord {
  id: number;
  bookingCode: string;
  customerName: string;
  courtName: string;
  date: string;
  totalAmount: number;
  deposit: number;
  remaining: number;
  status: 'paid' | 'pending' | 'partial';
  paymentMethod: string;
}

export const MOCK_PAYMENTS: PaymentRecord[] = [
  { id: 1,  bookingCode: 'BK-20260530-001', customerName: 'Nguyễn Văn An',   courtName: 'Sân 1',     date: '2026-05-30', totalAmount: 120000, deposit: 36000,  remaining: 84000,  status: 'pending', paymentMethod: 'Tiền mặt' },
  { id: 2,  bookingCode: 'BK-20260530-005', customerName: 'Ngô Thanh Inh',   courtName: 'Sân 2',     date: '2026-05-30', totalAmount: 160000, deposit: 48000,  remaining: 112000, status: 'pending', paymentMethod: 'MOMO / QR' },
  { id: 3,  bookingCode: 'BK-20260529-002', customerName: 'Nguyễn Văn An',   courtName: 'Sân 2',     date: '2026-05-29', totalAmount: 150000, deposit: 45000,  remaining: 0,      status: 'paid',    paymentMethod: 'Chuyển khoản' },
  { id: 4,  bookingCode: 'BK-20260529-003', customerName: 'Lê Hoàng Cường',  courtName: 'Sân 3',     date: '2026-05-29', totalAmount: 80000,  deposit: 24000,  remaining: 0,      status: 'paid',    paymentMethod: 'Tiền mặt' },
  { id: 5,  bookingCode: 'BK-20260528-001', customerName: 'Vũ Quang Phú',    courtName: 'Sân VIP 1', date: '2026-05-28', totalAmount: 360000, deposit: 108000, remaining: 0,      status: 'paid',    paymentMethod: 'Chuyển khoản' },
  { id: 6,  bookingCode: 'BK-20260528-002', customerName: 'Trần Thị Bình',   courtName: 'Sân 1',     date: '2026-05-28', totalAmount: 150000, deposit: 45000,  remaining: 0,      status: 'paid',    paymentMethod: 'MOMO / QR' },
  { id: 7,  bookingCode: 'BK-20260530-011', customerName: 'Đặng Thị Giang',  courtName: 'Sân 5',     date: '2026-05-30', totalAmount: 80000,  deposit: 24000,  remaining: 56000,  status: 'pending', paymentMethod: 'Tiền mặt' },
  { id: 8,  bookingCode: 'BK-20260530-012', customerName: 'Vũ Quang Phú',    courtName: 'Sân VIP 1', date: '2026-05-30', totalAmount: 440000, deposit: 132000, remaining: 308000, status: 'partial', paymentMethod: 'Chuyển khoản' },
];
