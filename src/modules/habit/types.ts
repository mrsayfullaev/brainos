/** Habits Module (V3) */
export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'CUSTOM';

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
}
