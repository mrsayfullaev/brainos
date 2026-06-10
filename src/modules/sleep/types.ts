/**
 * Sleep Module - Types
 */

export interface ParsedSleep {
  bedtime: Date;
  wakeup?: Date;
  quality?: number; // 1-10
  notes?: string;
}

export interface SleepInput {
  userId: string;
  bedtime: Date;
  wakeup: Date;
  quality?: number;
  notes?: string;
}
