import { PricingRule } from '../models';

export const MOCK_PRICING_RULES: PricingRule[] = [
  // Standard courts - Off-peak morning
  { id: 1, courtType: 'standard', timeStart: '06:00', timeEnd: '11:00', pricePerHour: 80000,  isPeak: false, peakSurcharge: 0,     discount: 0, label: 'Sáng sớm (Standard)' },
  // Standard courts - Midday
  { id: 2, courtType: 'standard', timeStart: '11:00', timeEnd: '15:00', pricePerHour: 100000, isPeak: false, peakSurcharge: 0,     discount: 0, label: 'Buổi trưa (Standard)' },
  // Standard courts - Peak afternoon/evening
  { id: 3, courtType: 'standard', timeStart: '15:00', timeEnd: '20:00', pricePerHour: 120000, isPeak: true,  peakSurcharge: 30000, discount: 0, label: 'Chiều tối cao điểm (Standard)' },
  // Standard courts - Late evening
  { id: 4, courtType: 'standard', timeStart: '20:00', timeEnd: '22:00', pricePerHour: 100000, isPeak: false, peakSurcharge: 0,     discount: 0, label: 'Tối muộn (Standard)' },

  // VIP courts - Off-peak morning
  { id: 5, courtType: 'vip', timeStart: '06:00', timeEnd: '11:00', pricePerHour: 150000, isPeak: false, peakSurcharge: 0,     discount: 0, label: 'Sáng sớm (VIP)' },
  // VIP courts - Midday
  { id: 6, courtType: 'vip', timeStart: '11:00', timeEnd: '15:00', pricePerHour: 180000, isPeak: false, peakSurcharge: 0,     discount: 0, label: 'Buổi trưa (VIP)' },
  // VIP courts - Peak afternoon/evening
  { id: 7, courtType: 'vip', timeStart: '15:00', timeEnd: '20:00', pricePerHour: 220000, isPeak: true,  peakSurcharge: 50000, discount: 0, label: 'Chiều tối cao điểm (VIP)' },
  // VIP courts - Late evening
  { id: 8, courtType: 'vip', timeStart: '20:00', timeEnd: '22:00', pricePerHour: 180000, isPeak: false, peakSurcharge: 0,     discount: 0, label: 'Tối muộn (VIP)' },
];
