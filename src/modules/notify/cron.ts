/**
 * V4 Smart Notifications — cron: отправка дайджестов
 */

import { prisma } from '../../database/client';
import { sendTelegramMessage } from '../../bot/sendMessage';
import { logger } from '../../utils/logger';
import { decrypt } from '../../utils/encryption';
import { parseUtcOffset, getCurrentLocalHHMM } from '../../utils/timezone';

/**
 * Отправляет дневной дайджест накопленных уведомлений (время по часовому поясу пользователя)
 */
export async function sendNotificationDigests(): Promise<void> {
  try {
    const settingsList = await prisma.notificationSettings.findMany({
      where: { digestEnabled: true },
      include: { user: { select: { telegramId: true, timezone: true } } },
    });

    const toSend = settingsList.filter((s) => {
      const offsetMinutes = parseUtcOffset(s.user?.timezone ?? null);
      const userLocalTime = getCurrentLocalHHMM(offsetMinutes);
      return s.digestTime === userLocalTime;
    });
    if (toSend.length === 0) return;

    for (const settings of toSend) {
      try {
        const pending = await prisma.pendingNotification.findMany({
          where: { userId: settings.userId, sent: false },
        });
        if (pending.length === 0) continue;

        const bySource = pending.reduce<Record<string, string[]>>((acc, p) => {
          try {
            const text = decrypt(p.message);
            if (text == null) return acc;
            if (!acc[p.source]) acc[p.source] = [];
            acc[p.source].push(text);
            return acc;
          } catch {
            return acc;
          }
        }, {});

        const lines = Object.entries(bySource).flatMap(([source, messages]) => [
          `**${source}:**`,
          ...messages.map((m) => `• ${m}`),
        ]);
        const digest = `Дайджест (${pending.length} уведомлений)\n\n${lines.join('\n')}`;
        await sendTelegramMessage(settings.user.telegramId, digest, { parse_mode: 'Markdown' });

        await prisma.pendingNotification.updateMany({
          where: { userId: settings.userId, sent: false },
          data: { sent: true, sentAt: new Date() },
        });
        logger.info(`Digest sent to user ${settings.userId}, ${pending.length} notifications`);
      } catch (err) {
        logger.error(`Digest failed for user ${settings.userId}:`, err);
      }
    }
  } catch (error) {
    logger.error('Error in sendNotificationDigests:', error);
  }
}
