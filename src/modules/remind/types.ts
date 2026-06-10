/**
 * Reminders Module - TypeScript Types
 * Модуль для smart-напоминаний с повторениями
 */

// Типы повторений
export type RecurrenceType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

// Результат парсинга напоминания
export interface ParsedReminder {
  text: string;
  triggerAt: Date;
  recurrence?: RecurrenceType;
  recurrenceRule?: string; // Cron-like rule для CUSTOM
}

// Входные данные для создания напоминания
export interface ReminderInput {
  userId: string;
  text: string;
  triggerAt: Date;
  recurrence?: RecurrenceType;
  recurrenceRule?: string;
  completed?: boolean;
}

// Напоминание с полными данными
export interface ReminderWithDetails {
  id: string;
  userId: string;
  text: string;
  triggerAt: Date;
  recurrence: RecurrenceType;
  recurrenceRule?: string;
  completed: boolean;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Статистика по напоминаниям
export interface ReminderStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  today: number;
  tomorrow: number;
  recurring: number;
}

// Контекст для AI
export interface ReminderContext {
  reminder: {
    text: string;
    triggerAt: Date;
    recurrence?: RecurrenceType;
  };
  upcomingReminders: Array<{
    text: string;
    triggerAt: Date;
  }>;
  stats: ReminderStats;
}
