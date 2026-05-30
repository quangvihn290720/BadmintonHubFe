export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
  },
  STAFF: {
    BASE: '/staff',
    DETAIL: (id: number) => `/staff/${id}`
  },
  BOOKINGS: {
    BASE: '/bookings',
    CHECKIN: (id: number) => `/bookings/${id}/checkin`,
    CHECKOUT: (id: number) => `/bookings/${id}/checkout`
  },
  CUSTOMERS: {
    BASE: '/customers',
    BOOKING: (id: number) => `/customers/${id}/booking`
  },
  PRICING: {
    BASE: '/pricing',
    DETAIL: (id: number) => `/pricing/${id}`
  }
};
