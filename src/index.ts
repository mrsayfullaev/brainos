import 'dotenv/config';
import { initSentry, captureException, flushSentry } from './utils/sentry';
import { logger } from './utils/logger';

initSentry();

// Непойманные rejections и uncaughtException → лог + Sentry
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('unhandledRejection:', reason);
  captureException(reason instanceof Error ? reason : new Error(String(reason)));
});
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException:', err);
  captureException(err);
});

import { bot } from './bot';
import { prisma } from './database/client';
import { closeRedis } from './utils/redis';
import { startPredictionsWorker, closePredictionsQueue } from './queues/predictions';
import { setupBotCommands } from './bot/commands';

// V2: Импортируем модули (автоматически регистрируются)
import './modules';
import { startModuleScheduler, stopModuleScheduler } from './modules/scheduler';
import { startWebhookServer } from './server';

async function main() {
  try {
    logger.info('🚀 Starting BrainOS Multi-AI Telegram Bot...');

    // Проверяем подключение к БД
    await prisma.$connect();
    logger.info('✅ Database connected');

    // V2: Запускаем scheduler для модулей
    startModuleScheduler();

    // V4: HTTP-сервер (health + при наличии конфига: Notion/Gmail OAuth)
    startWebhookServer();

    // V4: Очередь прогнозов (при Redis)
    startPredictionsWorker();

    // Устанавливаем команды бота для всех языков
    await setupBotCommands(bot);

    // Запускаем бота
    await bot.start({
      onStart: (botInfo) => {
        logger.info(`✅ Bot started: @${botInfo.username}`);
        logger.info('✅ Modules V2 active: wallet');
      },
    });
  } catch (error) {
    logger.error('Failed to start bot:', error);
    captureException(error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  stopModuleScheduler();
  try {
    await bot.stop();
  } catch (err) {
    logger.warn('Bot stop error (ignored during shutdown):', err);
  }
  await prisma.$disconnect();
  await closeRedis();
  await closePredictionsQueue();
  await flushSentry();
}

process.once('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

main();
