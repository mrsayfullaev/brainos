/**
 * Habits Module - Handlers (V3)
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createHabit, getHabits, addCompletion, getStreak } from './queries';
import { logger } from '../../utils/logger';

export async function handleHabitMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const trimmed = message.replace(/^@habit\s*/i, '').trim();

  try {
    if (/выполнил|сделал|done|completed|отметил/i.test(trimmed)) {
      const name = trimmed.replace(/выполнил|сделал|done|completed|отметил/gi, '').trim();
      const habits = await getHabits(user.id);
      const habit = habits.find((h) => h.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(h.name.toLowerCase()));
      if (!habit) {
        return { modulePrompt: `Habit not found for "${name}". List habits or add one. Reply in ${user.language}.` };
      }
      await addCompletion(habit.id, user.id);
      const stats = await getStreak(habit.id);
      const modulePrompt = `
=== HABIT COMPLETED ===
"${habit.name}"
Current streak: ${stats.currentStreak} days
Longest: ${stats.longestStreak}
Total: ${stats.totalCompletions}

Encourage briefly in ${user.language}.
      `.trim();
      logger.info('Habit completion recorded');
      return { modulePrompt };
    }

    if (/список|list|мои привычки|habits/i.test(trimmed) && trimmed.length < 25) {
      const habits = await getHabits(user.id);
      const lines = habits.map((h) => `• ${h.name} (${h.completions.length} записей)`).join('\n');
      const modulePrompt = `
=== HABITS LIST ===
${habits.length} habits:\n${lines || 'Нет привычек. Добавь: "привычка читать 20 минут"'}

Reply in ${user.language}.
      `.trim();
      return { modulePrompt, data: { habits } };
    }

    const name = trimmed.replace(/привычка|habit|каждый день|ежедневн/gi, '').trim() || 'Новая привычка';
    let frequency: 'DAILY' | 'WEEKLY' = 'DAILY';
    if (/недел|weekly|каждую неделю/i.test(trimmed)) frequency = 'WEEKLY';

    await createHabit({ userId: user.id, name, frequency });
    const total = (await getHabits(user.id)).length;
    const modulePrompt = `
=== HABIT CREATED ===
"${name}" (${frequency})
Total habits: ${total}

Confirm in ${user.language}. Say "выполнил [название]" to mark done.
    `.trim();
    logger.info('Habit created');
    return { modulePrompt };
  } catch (error) {
    logger.error('Error in Habit handler:', error);
    return { modulePrompt: `Error. Reply in ${user.language}.` };
  }
}
