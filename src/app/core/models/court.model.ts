export type CourtType = 'standard' | 'vip';

export interface Court {
  id: number;
  name: string;
  type: CourtType;
  description: string;
}
