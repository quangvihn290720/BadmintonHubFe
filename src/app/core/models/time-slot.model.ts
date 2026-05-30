export interface TimeSlot {
  id: number;
  startTime: string; // e.g. '06:00'
  endTime: string;   // e.g. '07:00'
  label: string;     // e.g. '06:00 - 07:00'
}
