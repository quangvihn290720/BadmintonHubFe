const AUTH = {
  LOGIN: '/auth/login',
} as const;

const LOAI_SANS = {
  BASE: '/loaisans'
} as const;

const DICH_VUS = {
  BASE: '/service-items'
} as const;

const KHUYEN_MAIS = {
  AVAILABLE: '/khuyenmais/available',
  APPLY: (lichdatId: string) => `/lichdats/${lichdatId}/khuyenmai`
} as const;

const NHAN_VIENS = {
  BASE: '/admin/nhanviens',
  DETAIL: (id: string | number) => `/admin/nhanviens/${id}`
} as const;

const ADMIN = {
  LOAI_SANS: '/admin/loaisans',
  LOAI_SAN_STATUS: (id: string) => `/admin/loaisans/${id}/status`,
  DICH_VUS: '/admin/service-items',
  DICH_VU_STOCK: (id: string) => `/admin/service-items/${id}/stock`,
  DICH_VU_STATUS: (id: string) => `/admin/service-items/${id}/status`,
  KHUYEN_MAIS: '/admin/khuyenmais',
  KHUYEN_MAI_STATUS: (id: string) => `/admin/khuyenmais/${id}/status`,
  NHAN_VIENS: '/admin/nhanviens',
  NHAN_VIEN_STATUS: (id: string) => `/admin/nhanviens/${id}/status`,
  NHAN_VIEN_ROLE: (id: string) => `/admin/nhanviens/${id}/role`,
  KHUNG_GIOS: '/admin/price-rules',
  KHUNG_GIO_STATUS: (id: string) => `/admin/price-rules/${id}/status`
} as const;

const LICHDATS = {
  BASE: '/lichdats',
  DETAIL: (id: string) => `/lichdats/${id}`,
  CHECKIN: (id: string) => `/lichdats/${id}/check-in`,
  DICH_VUS: (id: string) => `/lichdats/${id}/service-items`,
  CHECKOUT: (id: string) => `/lichdats/${id}/check-out`,
  CANCEL: (id: string) => `/lichdats/${id}/cancel`,
  SCHEDULE: (id: string) => `/lichdats/${id}/schedule`,
  SCHEDULES: '/schedules'
} as const;

const THANH_TOANS = {
  BASE: '/thanhtoans'
} as const;

const PAYMENTS = {
  INTENTS: '/payments/intents',
  INTENT: (id: string) => `/payments/intents/${id}`,
  MOCK_WEBHOOK: '/webhooks/payments/mock'
} as const;

const AUDIT = {
  LOGS: '/admin/audit-logs'
} as const;

const REPORTS = {
  DAILY_REVENUE: '/reports/daily-revenue',
  REVENUE_RANGE: '/reports/revenue-range'
} as const;

const KHACH_HANGS = {
  BASE: '/khachhangs',
  BY_PHONE: (phone: string) => `/khachhangs/by-phone/${phone}`,
  DETAIL: (id: string) => `/khachhangs/${id}`,
  STATUS: (id: string) => `/khachhangs/${id}/status`,
  BLACKLIST: (id: string) => `/khachhangs/${id}/blacklist`,
  ACTIVATE: (id: string) => `/khachhangs/${id}/activate`,
  VIP: (id: string) => `/khachhangs/${id}/vip`,
  LICHDATS: (id: string) => `/khachhangs/${id}/lichdats`
} as const;

const KHUNG_GIO = {
  BASE: '/admin/price-rules',
  DETAIL: (id: string | number) => `/admin/price-rules/${id}`,
  STATUS: (id: string) => `/admin/price-rules/${id}/status`
} as const;

export const API_ENDPOINTS = {
  AUTH,
  LOAI_SANS,
  DICH_VUS,
  KHUYEN_MAIS,
  NHAN_VIENS,
  ADMIN: {
    ...ADMIN,
    COURTS: ADMIN.LOAI_SANS,
    COURT_STATUS: ADMIN.LOAI_SAN_STATUS,
    SERVICE_ITEMS: ADMIN.DICH_VUS,
    SERVICE_ITEM_STOCK: ADMIN.DICH_VU_STOCK,
    SERVICE_ITEM_STATUS: ADMIN.DICH_VU_STATUS,
    EMPLOYEES: ADMIN.NHAN_VIENS,
    EMPLOYEE_STATUS: ADMIN.NHAN_VIEN_STATUS,
    EMPLOYEE_ROLE: ADMIN.NHAN_VIEN_ROLE
  },
  LICHDATS,
  THANH_TOANS,
  PAYMENTS,
  AUDIT,
  REPORTS,
  KHACH_HANGS,
  KHUNG_GIO,
  COURTS: LOAI_SANS,
  SERVICE_ITEMS: DICH_VUS,
  PROMOTIONS: KHUYEN_MAIS,
  STAFF: NHAN_VIENS,
  BOOKINGS: {
    ...LICHDATS,
    SERVICE_ITEMS: LICHDATS.DICH_VUS
  },
  CUSTOMERS: KHACH_HANGS,
  PRICING: KHUNG_GIO
} as const;
