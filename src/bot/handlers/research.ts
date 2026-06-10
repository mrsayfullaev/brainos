/**
 * V4 Research Agent — команда /research
 */

import type { BotContext } from '../index';
import type { User } from '@prisma/client';
import { conductResearch } from '../../modules/research/conduct';
import { logger } from '../../utils/logger';

export async function handleResearch(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('Ошибка авторизации. Попробуйте /start.');
    return;
  }

  const text = ctx.message?.text?.replace(/^\/research\s*/i, '').trim();
  if (!text) {
    await ctx.reply('Напишите запрос после команды.\nПример: /research Сравнение топ-5 CRM для малого бизнеса');
    return;
  }

  try {
    await ctx.reply('Ищу и готовлю отчёт…');
    const report = await conductResearch(ctx.user.id, ctx.user as User, text);
    const chunk = report.slice(0, 4000);
    await ctx.reply(chunk, { parse_mode: 'Markdown' });
    if (report.length > 4000) {
      await ctx.reply(report.slice(4000, 8000));
    }
  } catch (err) {
    logger.error('Research command failed:', err);
    await ctx.reply('Не удалось подготовить отчёт. Попробуйте позже или сократите запрос.');
  }
}
