/**
 * Reminders Module - Cron Jobs
 * Проверка и отправка напоминаний каждую минуту
 */

import { logger } from '../../utils/logger';
import { sendTelegramMessage } from '../../bot/sendMessage';
import { getDueReminders, markReminderNotified } from './queries';
import { calculateNextTrigger } from './parser';

/**
 * Проверяет напоминания и отправляет уведомления
 * Запускается каждую минуту
 */
export async function checkReminders() {
  try {
    logger.debug('Checking reminders...');
    
    const dueReminders = await getDueReminders();
    
    if (dueReminders.length === 0) {
      return;
    }
    
    logger.info(`Found ${dueReminders.length} due reminders`);
    
    let sentCount = 0;
    
    for (const reminder of dueReminders) {
      try {
        await sendTelegramMessage(reminder.telegramId, `Напоминание: ${reminder.text}`);
        logger.info(`Reminder sent to user ${reminder.userId}: "${reminder.text.substring(0, 30)}..."`);
        
        // Если повторяющееся - создаём следующий trigger
        if (reminder.recurrence !== 'ONCE') {
          const nextTrigger = calculateNextTrigger(
            reminder.triggerAt,
            reminder.recurrence as any,
            reminder.recurrenceRule || undefined
          );
          
          await markReminderNotified(reminder.id, nextTrigger);
          logger.info(`Recurring reminder: next trigger set to ${nextTrigger.toISOString()}`);
        } else {
          await markReminderNotified(reminder.id);
        }
        
        sentCount++;
      } catch (error) {
        logger.error(`Failed to send reminder ${reminder.id}:`, error);
      }
    }
    
    logger.info(`Reminders check completed: ${sentCount}/${dueReminders.length} sent`);
  } catch (error) {
    logger.error('Error in checkReminders job:', error);
  }
}
