/**
 * Pets Module - Cron: vaccination reminders (V3)
 */

import { logger } from '../../utils/logger';
import { sendTelegramMessage } from '../../bot/sendMessage';
import { getUpcomingVaccinations } from './queries';

export async function checkVaccinationReminders(): Promise<void> {
  try {
    const upcoming = await getUpcomingVaccinations(7);
    if (upcoming.length === 0) return;
    logger.info(`Vaccination reminders: ${upcoming.length} upcoming`);
    for (const v of upcoming) {
      const days = v.nextDue ? Math.ceil((new Date(v.nextDue).getTime() - Date.now()) / 86400000) : 0;
      logger.info(`  ${v.petName}: ${v.name} in ${days} days`);
      await sendTelegramMessage(v.telegramId, `Напоминание: ${v.petName} — прививка "${v.name}" через ${days} дн.`);
    }
  } catch (error) {
    logger.error('Error in checkVaccinationReminders:', error);
  }
}
