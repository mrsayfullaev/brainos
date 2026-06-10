/**
 * Reminders Module - AI Prompts
 */

import type { User } from '@prisma/client';
import type { ReminderContext } from './types';

/**
 * Строит промпт для напоминаний
 */
export function buildReminderPrompt(context: ReminderContext & { user: User }): string {
  const { user, reminder, upcomingReminders, stats } = context;
  
  const parts: string[] = [];
  
  // Заголовок
  parts.push(`
=== REMINDER MODULE CONTEXT ===
You are helping with reminders.
`);
  
  // Текущее напоминание
  parts.push(`
NEW REMINDER:
"${reminder.text}"
Trigger: ${reminder.triggerAt.toLocaleString()}
${reminder.recurrence && reminder.recurrence !== 'ONCE' ? `Repeats: ${reminder.recurrence}` : 'One-time reminder'}
`);
  
  // Предстоящие напоминания
  if (upcomingReminders.length > 0) {
    parts.push(`
UPCOMING REMINDERS:
${upcomingReminders.map((r, i) => 
  `${i + 1}. "${r.text}" - ${r.triggerAt.toLocaleString()}`
).join('\n')}
`);
  }
  
  // Статистика
  parts.push(`
STATISTICS:
- Active: ${stats.active}
- Overdue: ${stats.overdue}
- Today: ${stats.today}
- Tomorrow: ${stats.tomorrow}
${stats.recurring > 0 ? `- Recurring: ${stats.recurring}` : ''}
`);
  
  // Инструкции
  parts.push(`
YOUR TASK:
1. Confirm the reminder was set
2. Tell them when they'll be reminded
3. ${stats.overdue > 0 ? '**IMPORTANT:** Mention they have overdue reminders!' : ''}
4. Keep it SHORT (2-3 sentences)
5. Be friendly and reassuring
6. Respond in ${user.language}

DO NOT:
- List all reminders (only mention important ones)
- Be too verbose
`);
  
  return parts.join('\n').trim();
}
