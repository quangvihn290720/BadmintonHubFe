export interface Customer {
  id: number;
  backendId?: string;
  name: string;
  phone: string;
  email: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
  totalBookings: number;
  joinDate: string;
  points?: number;
}

export function getVipTier(points?: number): 'Đồng' | 'Bạc' | 'Vàng' {
  const pts = points || 0;
  if (pts >= 500) return 'Vàng';
  if (pts >= 100) return 'Bạc';
  return 'Đồng';
}
