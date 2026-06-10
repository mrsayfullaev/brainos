/**
 * Общие типы для модулей V2
 */

import type { User } from '@prisma/client';
import type { Context } from 'grammy';

// Типы модулей
export type ModuleName =
  | 'task'
  | 'remind'
  | 'note'
  | 'wallet'
  | 'sub'
  | 'savings'
  | 'debt'
  | 'health'
  | 'workout'
  | 'sleep'
  | 'water'
  | 'food'
  | 'vocab'
  | 'book'
  | 'contact'
  | 'news'
  | 'idea'
  | 'trip'
  | 'place'
  | 'buy'
  | 'quote'
  // V3
  | 'kb'
  | 'habit'
  | 'invest'
  | 'course'
  | 'email'
  | 'later'
  | 'project'
  | 'car'
  | 'pet';

/** Список всех имён модулей (для справки, роутера и т.д.) */
export const MODULE_NAMES: readonly ModuleName[] = [
  'task', 'remind', 'note', 'wallet', 'sub', 'savings', 'debt',
  'health', 'workout', 'sleep', 'water', 'food', 'vocab', 'book',
  'contact', 'news', 'idea', 'trip', 'place', 'buy', 'quote',
  'kb', 'habit', 'invest', 'course', 'email', 'later', 'project', 'car', 'pet',
];

// Действия модулей
export type ModuleAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'analyze'
  | 'none';

// Результат анализа намерений
export interface IntentAnalysis {
  module: ModuleName | null;
  action: ModuleAction;
  confidence: number; // 0-100
}

// Результат обработки модуля
export interface ModuleResult {
  modulePrompt: string; // Контекст для AI (добавляется к базовому промпту)
  data?: any; // Данные, сохранённые модулем (опционально)
  skipAI?: boolean; // Если true, пропустить AI и использовать готовый ответ
  directResponse?: string; // Прямой ответ без AI (если skipAI = true)
}

// Обработчик модуля
export type ModuleHandler = (
  ctx: Context,
  user: User,
  message: string
) => Promise<ModuleResult>;

// Реестр обработчиков модулей
export type ModuleHandlerRegistry = {
  [K in ModuleName]?: ModuleHandler;
};
