/**
 * Планировщик задач для модулей V2
 * Управляет cron jobs для всех модулей
 */

import cron from 'node-cron';
import { logger } from '../utils/logger';

// Cron jobs модулей
import { sendWeeklyDigests, checkBudgetAlerts, sendMonthlyForecast } from './wallet/cron';
import { checkReminders } from './remind/cron';
import { checkVaccinationReminders } from './pet/cron';
import { checkMeetingPrep } from './meeting/cron';
import { sendNotificationDigests } from './notify/cron';
import { sendWeeklyPredictions } from './predict/cron';
import { runNotionSyncCron } from './notion/sync';
import { getPredictionsQueue, addPredictionsJob } from '../queues/predictions';
import { fetchInbox } from './inbox/fetch';
import { getAllEmailAccountUserIds } from './inbox/queries';
import { isGmailOAuthConfigured } from './inbox/oauth';
import { runCalendarSyncForAllUsers } from './meeting/sync-calendar';

/**
 * Запускает все scheduled tasks для модулей
 */
export function startModuleScheduler(): void {
  logger.info('Starting module scheduler...');

  // ===== REMINDER MODULE =====
  
  // Проверка напоминаний каждую минуту
  cron.schedule('* * * * *', async () => {
    try {
      await checkReminders();
    } catch (error) {
      logger.error('Error in reminders cron job:', error);
    }
  });
  logger.info('✓ Reminders: Check scheduled (every minute)');

  // ===== WALLET MODULE =====
  
  // Отправка еженедельных дайджестов по воскресеньям в 20:00
  cron.schedule('0 20 * * 0', async () => {
    try {
      await sendWeeklyDigests();
    } catch (error) {
      logger.error('Error in wallet weekly digest cron job:', error);
    }
  });
  logger.info('✓ Wallet: Weekly digests scheduled (Sundays at 8 PM)');
  
  // Проверка бюджетов каждый день в 18:00
  cron.schedule('0 18 * * *', async () => {
    try {
      await checkBudgetAlerts();
    } catch (error) {
      logger.error('Error in wallet budget alerts cron job:', error);
    }
  });
  logger.info('✓ Wallet: Budget alerts scheduled (daily at 6 PM)');
  
  // Прогноз расходов 25-го числа каждого месяца в 10:00
  cron.schedule('0 10 25 * *', async () => {
    try {
      await sendMonthlyForecast();
    } catch (error) {
      logger.error('Error in wallet monthly forecast cron job:', error);
    }
  });
  logger.info('✓ Wallet: Monthly forecast scheduled (25th of month at 10 AM)');

  // ===== V3: PETS - Vaccination reminders (daily 9:00) =====
  cron.schedule('0 9 * * *', async () => {
    try {
      await checkVaccinationReminders();
    } catch (error) {
      logger.error('Error in pet vaccination reminders:', error);
    }
  });
  logger.info('✓ Pets: Vaccination reminders scheduled (daily at 9 AM)');

  // ===== V4: MEETING AGENT — преподготовка за 1 ч до встречи =====
  cron.schedule('*/10 * * * *', async () => {
    try {
      await checkMeetingPrep();
    } catch (error) {
      logger.error('Error in meeting prep cron:', error);
    }
  });
  logger.info('✓ Meeting: Prep check scheduled (every 10 min)');

  // ===== V4: SMART NOTIFICATIONS — дайджест =====
  cron.schedule('* * * * *', async () => {
    try {
      await sendNotificationDigests();
    } catch (error) {
      logger.error('Error in notification digests:', error);
    }
  });
  logger.info('✓ Notify: Digest check scheduled (every minute)');

  // ===== V4: AI PREDICTIONS — еженедельные прогнозы (понедельник 9:00) =====
  cron.schedule('0 9 * * 1', async () => {
    try {
      if (getPredictionsQueue()) {
        await addPredictionsJob();
      } else {
        await sendWeeklyPredictions();
      }
    } catch (error) {
      logger.error('Error in weekly predictions cron:', error);
    }
  });
  logger.info('✓ Predict: Weekly predictions scheduled (Mondays at 9 AM)');

  // ===== V4: NOTION — синхронизация (ежедневно 3:00) =====
  cron.schedule('0 3 * * *', async () => {
    try {
      await runNotionSyncCron();
    } catch (error) {
      logger.error('Error in Notion sync cron:', error);
    }
  });
  logger.info('✓ Notion: Sync cron scheduled (daily at 3 AM)');

  // ===== V4: INBOX — синхронизация Gmail (каждые 30 мин) =====
  cron.schedule('*/30 * * * *', async () => {
    if (!isGmailOAuthConfigured()) return;
    try {
      const userIds = await getAllEmailAccountUserIds();
      for (const userId of userIds) {
        await fetchInbox(userId);
      }
    } catch (error) {
      logger.error('Error in inbox fetch cron:', error);
    }
  });
  logger.info('✓ Inbox: Gmail fetch scheduled (every 30 min)');

  // ===== V4: MEETING — синхронизация Google Calendar (каждые 30 мин) =====
  cron.schedule('*/30 * * * *', async () => {
    try {
      await runCalendarSyncForAllUsers();
    } catch (error) {
      logger.error('Error in calendar sync cron:', error);
    }
  });
  logger.info('✓ Meeting: Google Calendar sync scheduled (every 30 min)');

  // ===== REMINDERS MODULE ===== (TODO)
  // Проверка напоминаний каждую минуту
  // cron.schedule('* * * * *', async () => {
  //   try {
  //     await checkReminders();
  //   } catch (error) {
  //     logger.error('Error in reminders cron job:', error);
  //   }
  // });
  // logger.info('✓ Reminders cron job scheduled (every minute)');

  // ===== SUBSCRIPTIONS MODULE ===== (TODO)
  // Проверка подписок каждый день в 9:00
  // cron.schedule('0 9 * * *', async () => {
  //   try {
  //     await checkSubscriptions();
  //   } catch (error) {
  //     logger.error('Error in subscriptions cron job:', error);
  //   }
  // });
  // logger.info('✓ Subscriptions cron job scheduled (daily at 9 AM)');

  // ===== CONTACTS MODULE ===== (TODO)
  // Проверка дней рождения каждый день в 8:00
  // cron.schedule('0 8 * * *', async () => {
  //   try {
  //     await checkBirthdays();
  //   } catch (error) {
  //     logger.error('Error in birthdays cron job:', error);
  //   }
  // });
  // logger.info('✓ Birthdays cron job scheduled (daily at 8 AM)');

  // ===== VOCAB MODULE ===== (TODO)
  // Напоминания о повторении слов каждый день в 10:00
  // cron.schedule('0 10 * * *', async () => {
  //   try {
  //     await sendVocabReviewReminders();
  //   } catch (error) {
  //     logger.error('Error in vocab review cron job:', error);
  //   }
  // });
  // logger.info('✓ Vocab review cron job scheduled (daily at 10 AM)');

  // ===== NEWS MODULE ===== (TODO)
  // Генерация дневных дайджестов каждый день в 7:00
  // cron.schedule('0 7 * * *', async () => {
  //   try {
  //     await generateDailyNewsDigests();
  //   } catch (error) {
  //     logger.error('Error in news digest cron job:', error);
  //   }
  // });
  // logger.info('✓ News digest cron job scheduled (daily at 7 AM)');

  logger.info('✅ Module scheduler started with 9 active jobs');
}

/**
 * Останавливает все cron jobs (для graceful shutdown)
 */
export function stopModuleScheduler(): void {
  logger.info('Stopping all cron jobs...');
  cron.getTasks().forEach((task) => {
    task.stop();
  });
  logger.info('✅ All cron jobs stopped');
}
