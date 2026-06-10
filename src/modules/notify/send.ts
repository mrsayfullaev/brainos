/**
 * V4 Smart Notifications — отправка с учётом приоритета и DND
 */

import { prisma } from '../../database/client';
import { sendTelegramMessage } from '../../bot/sendMessage';
import { encrypt } from '../../utils/encryption';
import type { NotifPriority } from '@prisma/client';
import { parseUtcOffset, getCurrentLocalHHMM, isLocalTimeInRange } from '../../utils/timezone';

function isInDNDWindow(
  localHHMM: string,
  settings: { dndEnabled: boolean; dndStart: string | null; dndEnd: string | null }
): boolean {
  if (!settings.dndEnabled || !settings.dndStart || !settings.dndEnd) return false;
  return isLocalTimeInRange(localHHMM, settings.dndStart, settings.dndEnd);
}

/**
 * Отправить уведомление пользователю с учётом приоритета и настроек (DND, дайджест)
 */
export async function sendNotification(
  userId: string,
  message: string,
  priority: NotifPriority,
  source: string
): Promise<void> {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true, timezone: true },
  });
  if (!user) return;

  const offsetMinutes = parseUtcOffset(user.timezone);
  const localHHMM = getCurrentLocalHHMM(offsetMinutes);
  const encryptedMessage = encrypt(message) ?? message;

  if (settings?.dndEnabled && isInDNDWindow(localHHMM, settings)) {
    if (priority !== 'URGENT') {
      await prisma.pendingNotification.create({
        data: {
          userId,
          message: encryptedMessage,
          priority,
          source,
        },
      });
      return;
    }
  }

  if (priority === 'URGENT' || !settings?.digestEnabled) {
    await sendTelegramMessage(user.telegramId, message);
    await prisma.pendingNotification.create({
      data: {
        userId,
        message: encryptedMessage,
        priority,
        source,
        sent: true,
        sentAt: new Date(),
      },
    });
  } else {
    await prisma.pendingNotification.create({
      data: { userId, message: encryptedMessage, priority, source },
    });
  }
}
