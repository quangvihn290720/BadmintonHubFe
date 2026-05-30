import { Customer } from '../models';

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 1,  name: 'Nguyễn Văn An',      phone: '0901234567', email: 'an.nguyen@email.com',    isBlacklisted: false, totalBookings: 25, joinDate: '2025-01-15', points: 120 },
  { id: 2,  name: 'Trần Thị Bình',      phone: '0912345678', email: 'binh.tran@email.com',    isBlacklisted: false, totalBookings: 18, joinDate: '2025-02-20', points: 90 },
  { id: 3,  name: 'Lê Hoàng Cường',     phone: '0923456789', email: 'cuong.le@email.com',     isBlacklisted: false, totalBookings: 32, joinDate: '2024-11-10', points: 240 },
  { id: 4,  name: 'Phạm Minh Đức',      phone: '0934567890', email: 'duc.pham@email.com',     isBlacklisted: true,  blacklistReason: 'Hủy đặt sân nhiều lần không báo trước', totalBookings: 8, joinDate: '2025-03-01', points: 10 },
  { id: 5,  name: 'Hoàng Thị Em',       phone: '0945678901', email: 'em.hoang@email.com',     isBlacklisted: false, totalBookings: 12, joinDate: '2025-04-05', points: 60 },
  { id: 6,  name: 'Vũ Quang Phú',       phone: '0956789012', email: 'phu.vu@email.com',       isBlacklisted: false, totalBookings: 45, joinDate: '2024-06-15', points: 450 },
  { id: 7,  name: 'Đặng Thị Giang',     phone: '0967890123', email: 'giang.dang@email.com',   isBlacklisted: false, totalBookings: 7,  joinDate: '2025-05-10', points: 35 },
  { id: 8,  name: 'Bùi Văn Hải',        phone: '0978901234', email: 'hai.bui@email.com',      isBlacklisted: true,  blacklistReason: 'Gây mất trật tự, làm hư hỏng tài sản sân', totalBookings: 3, joinDate: '2025-04-20', points: 5 },
  { id: 9,  name: 'Ngô Thanh Inh',      phone: '0989012345', email: 'inh.ngo@email.com',      isBlacklisted: false, totalBookings: 15, joinDate: '2025-01-25', points: 75 },
  { id: 10, name: 'Đỗ Thị Kim',         phone: '0990123456', email: 'kim.do@email.com',       isBlacklisted: false, totalBookings: 22, joinDate: '2024-09-30', points: 180 },
  { id: 11, name: 'Lý Minh Long',       phone: '0901112233', email: 'long.ly@email.com',      isBlacklisted: false, totalBookings: 30, joinDate: '2024-08-12', points: 300 },
  { id: 12, name: 'Trương Thị Mai',     phone: '0912223344', email: 'mai.truong@email.com',   isBlacklisted: false, totalBookings: 9,  joinDate: '2025-05-01', points: 45 },
  { id: 13, name: 'Cao Văn Nam',        phone: '0923334455', email: 'nam.cao@email.com',      isBlacklisted: false, totalBookings: 16, joinDate: '2025-02-14', points: 80 },
  { id: 14, name: 'Hồ Thị Oanh',       phone: '0934445566', email: 'oanh.ho@email.com',      isBlacklisted: false, totalBookings: 20, joinDate: '2024-12-01', points: 150 },
  { id: 15, name: 'Phan Quốc Phong',    phone: '0945556677', email: 'phong.phan@email.com',   isBlacklisted: true,  blacklistReason: 'Nợ tiền cọc 3 lần liên tiếp', totalBookings: 5, joinDate: '2025-03-15', points: 12 },
];
