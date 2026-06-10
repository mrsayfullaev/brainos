/**
 * V4 AI Predictions — еженедельная рассылка прогнозов
 */

import { prisma } from '../../database/client';
import { sendTelegramMessage } from '../../bot/sendMessage';
import { generatePredictions } from './generate';
import { logger } from '../../utils/logger';

/**
 * Понедельник 9:00 — отправка прогнозов пользователям с Pro/Team (или всем, у кого есть данные)
 */
export async function sendWeeklyPredictions(): Promise<void> {
  try {
    const plans = await prisma.planSubscription.findMany({
      where: { tier: { in: ['PRO', 'TEAM'] }, status: 'ACTIVE' },
      include: { user: { select: { id: true, telegramId: true } } },
    });
    if (plans.length === 0) return;

    for (const plan of plans) {
      const user = plan.user;
      if (!user?.telegramId) continue;
      try {
        const list = await generatePredictions(user.id);
        if (list.length === 0) continue;
        const text =
          'Прогнозы на неделю\n\n' +
          list.map((p) => p.message).join('\n\n') +
          '\n\nУдачной недели!';
        await sendTelegramMessage(user.telegramId, text);
        logger.info(`Predictions sent to user ${user.id}, ${list.length} items`);
      } catch (e) {
        logger.error(`Predictions failed for user ${user.id}:`, e);
      }
    }
  } catch (error) {
    logger.error('Error in sendWeeklyPredictions:', error);
  }
}
