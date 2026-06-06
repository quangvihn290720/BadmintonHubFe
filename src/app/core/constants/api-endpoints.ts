export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
  },
  COURTS: {
    BASE: '/courts'
  },
  SERVICE_ITEMS: {
    BASE: '/service-items'
  },
  PROMOTIONS: {
    AVAILABLE: '/promotions/available',
    APPLY: (bookingId: string) => `/bookings/${bookingId}/promotion`
  },
  STAFF: {
    BASE: '/admin/employees',
    DETAIL: (id: string | number) => `/admin/employees/${id}`
  },
  ADMIN: {
    COURTS: '/admin/courts',
    COURT_STATUS: (id: string) => `/admin/courts/${id}/status`,
    SERVICE_ITEMS: '/admin/service-items',
    SERVICE_ITEM_STOCK: (id: string) => `/admin/service-items/${id}/stock`,
    SERVICE_ITEM_STATUS: (id: string) => `/admin/service-items/${id}/status`,
    PROMOTIONS: '/admin/promotions',
    PROMOTION_STATUS: (id: string) => `/admin/promotions/${id}/status`,
    EMPLOYEES: '/admin/employees',
    EMPLOYEE_STATUS: (id: string) => `/admin/employees/${id}/status`,
    EMPLOYEE_ROLE: (id: string) => `/admin/employees/${id}/role`,
    PRICE_RULES: '/admin/price-rules',
    PRICE_RULE_STATUS: (id: string) => `/admin/price-rules/${id}/status`
  },
  BOOKINGS: {
    BASE: '/bookings',
    DETAIL: (id: string) => `/bookings/${id}`,
    CHECKIN: (id: string) => `/bookings/${id}/check-in`,
    SERVICE_ITEMS: (id: string) => `/bookings/${id}/service-items`,
    CHECKOUT: (id: string) => `/bookings/${id}/check-out`,
    CANCEL: (id: string) => `/bookings/${id}/cancel`,
    SCHEDULES: '/schedules'
  },
  REPORTS: {
    DAILY_REVENUE: '/reports/daily-revenue',
    REVENUE_RANGE: '/reports/revenue-range'
  },
  CUSTOMERS: {
    BASE: '/customers',
    BY_PHONE: (phone: string) => `/customers/by-phone/${phone}`,
    DETAIL: (id: string) => `/customers/${id}`,
    STATUS: (id: string) => `/customers/${id}/status`,
    BLACKLIST: (id: string) => `/customers/${id}/blacklist`,
    ACTIVATE: (id: string) => `/customers/${id}/activate`,
    BOOKING: (id: number) => `/customers/${id}/booking`
  },
  PRICING: {
    BASE: '/admin/price-rules',
    DETAIL: (id: string | number) => `/admin/price-rules/${id}`,
    STATUS: (id: string) => `/admin/price-rules/${id}/status`
  }
};
