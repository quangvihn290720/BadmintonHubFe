export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
  totalBookings: number;
  joinDate: string;
  points?: number;
}
