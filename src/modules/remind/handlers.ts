/**
 * Reminders Module - Handlers
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { parseReminder } from './parser';
import { 
  createReminder, 
  getReminders,
  getReminderStats
} from './queries';
import { buildReminderPrompt } from './prompts';
import { logger } from '../../utils/logger';

/**
 * Обработчик создания напоминания
 */
export async function handleReminderMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  try {
    logger.info(`Reminder module: processing message for user ${user.id}`);
    
    // 1. Парсим напоминание (время в поясе пользователя)
    const parsed = await parseReminder(message, user.language, (user as { timezone?: string | null }).timezone);
    
    // 2. Создаём напоминание
    const reminder = await createReminder({
      userId: user.id,
      ...parsed,
    });
    
    // 3. Получаем контекст
    const upcomingReminders = await getReminders(user.id, { 
      completed: false,
      limit: 5 
    });
    const stats = await getReminderStats(user.id);
    
    // 4. Строим промпт для AI
    const modulePrompt = buildReminderPrompt({
      user,
      reminder: {
        text: reminder.text,
        triggerAt: reminder.triggerAt,
        recurrence: reminder.recurrence as any,
      },
      upcomingReminders: upcomingReminders.map(r => ({
        text: r.text,
        triggerAt: r.triggerAt,
      })),
      stats,
    });
    
    logger.info('Reminder module: reminder created successfully');
    
    return {
      modulePrompt,
      data: reminder,
    };
  } catch (error) {
    logger.error('Error in reminder module handler:', error);
    
    return {
      modulePrompt: `
You are helping with reminders.
There was an error creating the reminder.
Please acknowledge the error and ask the user to try again.
Respond in ${user.language}.
      `.trim(),
    };
  }
}

/**
 * Обработчик показа списка напоминаний
 */
export async function handleShowReminders(
  _ctx: Context,
  user: User,
  filter?: 'today' | 'upcoming' | 'all'
): Promise<ModuleResult> {
  try {
    const reminders = await getReminders(user.id, { completed: false });
    const stats = await getReminderStats(user.id);
    
    let filteredReminders = reminders;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (filter === 'today') {
      filteredReminders = reminders.filter(r => 
        r.triggerAt >= today && r.triggerAt < tomorrow
      );
    } else if (filter === 'upcoming') {
      filteredReminders = reminders.filter(r => 
        r.triggerAt >= now
      ).slice(0, 10);
    }
    
    const modulePrompt = `
You are a reminder assistant.
User requested their reminders${filter ? ` (filter: ${filter})` : ''}.

Reminders (${filteredReminders.length}):
${filteredReminders.slice(0, 10).map((r, i) => {
  const when = r.triggerAt > now 
    ? `in ${Math.round((r.triggerAt.getTime() - now.getTime()) / (1000 * 60))} minutes`
    : 'OVERDUE';
  return `${i + 1}. ${r.text} (${when})${r.recurrence !== 'ONCE' ? ` [${r.recurrence}]` : ''}`;
}).join('\n')}

Stats:
- Active: ${stats.active}
- Today: ${stats.today}
- Tomorrow: ${stats.tomorrow}
- Overdue: ${stats.overdue}
- Recurring: ${stats.recurring}

Present this information clearly in ${user.language}.
${stats.overdue > 0 ? 'IMPORTANT: Mention overdue reminders!' : ''}
    `.trim();
    
    return {
      modulePrompt,
      data: { reminders: filteredReminders, stats },
    };
  } catch (error) {
    logger.error('Error showing reminders:', error);
    throw error;
  }
}
