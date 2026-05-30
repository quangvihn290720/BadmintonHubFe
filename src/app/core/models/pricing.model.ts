import { CourtType } from './court.model';

export interface PricingRule {
  id: number;
  courtType: CourtType;
  timeStart: string;  // HH:mm
  timeEnd: string;    // HH:mm
  pricePerHour: number;
  isPeak: boolean;
  peakSurcharge: number;
  discount: number;
  label: string;
}
