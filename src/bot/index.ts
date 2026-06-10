import { Bot, Context, session, SessionFlavor } from 'grammy';
import { limit } from '@grammyjs/ratelimiter';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { captureException } from '../utils/sentry';
import { authMiddleware } from './middleware/auth';
import { consentMiddleware } from './middleware/consent';
import { languageMiddleware } from './middleware/language';
import { SessionData } from './types';

// Handlers
import { handleStart, handleOnboardingCallback } from './handlers/start';
import { handleConsentAgree, handleConsentDecline } from './handlers/consent';
import { 
  handleSettings, 
  handleEditSettings, 
  handleEditParameter, 
  handleSettingsCallback,
  handleDeleteAccount,
  handleConfirmDelete,
  handleExportData,
  handlePlanDetails,
} from './handlers/settings';
import { handleHelp } from './handlers/help';
import { handleResearch } from './handlers/research';
import { handlePremium, handlePremiumCallback } from './handlers/premium';
import { handlePreCheckout, handleSuccessfulPayment } from '../modules/premium/telegram-stars';
import { handleNotion, handleNotionLink, handleNotionCallback } from './handlers/notion';
import { handleInbox, handleInboxCallback } from './handlers/inbox';
import { handleMessage, handleVoice } from './handlers/message';
import type { Language } from '../localization';

// Расширяем контекст с user и session
export interface BotContext extends Context, SessionFlavor<SessionData> {
  user?: {
    id: string;
    telegramId: bigint;
    name: string | null;
    language: Language;
    consentGivenAt: Date | null;
    tone: string | null;
    length: string | null;
    emoji: string | null;
    structure: string | null;
    style: string | null;
    detail: string | null;
    customPrompt: string | null;
    timezone: string | null;
  };
}

// Создаём бот с типизированным контекстом
export const bot = new Bot<BotContext>(config.TELEGRAM_BOT_TOKEN);

// Session middleware (для хранения состояния онбординга)
bot.use(
  session({
    initial: (): SessionData => ({
      onboardingStep: null,
      onboardingData: {},
    }),
  })
);

// Rate limiting
bot.use(
  limit({
    timeFrame: parseInt(config.RATE_LIMIT_WINDOW_MS),
    limit: parseInt(config.RATE_LIMIT_MAX_REQUESTS),
    onLimitExceeded: async (ctx) => {
      await ctx.reply('Слишком много запросов. Подождите немного.');
    },
  })
);

// Auth middleware (загрузка пользователя из БД)
bot.use(authMiddleware);

// Consent middleware (блок до согласия на ПД)
bot.use(consentMiddleware);

// Language middleware
bot.use(languageMiddleware);

// Command handlers
bot.command('start', handleStart);
bot.command('settings', handleSettings);
bot.command('help', handleHelp);
bot.command('research', handleResearch);
bot.command('premium', handlePremium);
bot.command('notion', handleNotion);
bot.command('notion_link', handleNotionLink);
bot.command('inbox', handleInbox);

// Callback query handlers (для кнопок)

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  logger.debug(`Callback query: ${data}`);
  
  if (!data) {
    await ctx.answerCallbackQuery();
    return;
  }

  // Consent callbacks (согласие на обработку ПД)
  if (data === 'consent:agree') {
    await handleConsentAgree(ctx as any);
    return;
  }
  if (data === 'consent:decline') {
    await handleConsentDecline(ctx as any);
    return;
  }

  // Проверяем, идет ли онбординг или редактирование настроек
  const isOnboarding = ctx.session?.onboardingStep && !['name', 'custom'].includes(ctx.session.onboardingStep);
  
  // Онбординг callbacks и настройки
  if (
    data.startsWith('lang:') ||
    data.startsWith('tone:') ||
    data.startsWith('length:') ||
    data.startsWith('emoji:') ||
    data.startsWith('structure:') ||
    data.startsWith('style:') ||
    data.startsWith('detail:') ||
    data.startsWith('bonus:') ||
    data.startsWith('timezone:') ||
    data === 'done'
  ) {
    if (data === 'done' || data.startsWith('bonus:') || isOnboarding) {
      // Если это онбординг, используем handler онбординга
      await handleOnboardingCallback(ctx as any);
    } else {
      // Если это редактирование настроек
      const [action, value] = data.split(':');
      if (value) {
        await handleSettingsCallback(ctx as any, action, value);
      } else {
        await ctx.answerCallbackQuery();
      }
    }
    return;
  }
  
  // Settings callbacks
  if (data === 'edit_settings') {
    await handleEditSettings(ctx);
    return;
  }

  if (data === 'plan_details') {
    await handlePlanDetails(ctx as any);
    return;
  }
  
  if (data.startsWith('edit:')) {
    const parameter = data.replace('edit:', '');
    await handleEditParameter(ctx as any, parameter);
    return;
  }
  
  if (data === 'back_to_settings') {
    // Очищаем сессию
    ctx.session.onboardingStep = null;
    ctx.session.onboardingData = {};
    await handleSettings(ctx as any);
    await ctx.answerCallbackQuery();
    return;
  }
  
  // Delete account callbacks
  if (data === 'export_data') {
    await handleExportData(ctx as any);
    return;
  }

  if (data === 'delete_account') {
    await handleDeleteAccount(ctx as any);
    return;
  }
  
  if (data === 'confirm_delete') {
    await handleConfirmDelete(ctx as any);
    return;
  }

  if (data?.startsWith('premium:')) {
    await handlePremiumCallback(ctx as any);
    return;
  }

  if (data === 'notion:disconnect') {
    await handleNotionCallback(ctx as any);
    return;
  }

  if (data === 'inbox:disconnect') {
    await handleInboxCallback(ctx as any);
    return;
  }

  await ctx.answerCallbackQuery();
});

// Обработка платежей Telegram Stars (pre_checkout и successful_payment)
bot.on('pre_checkout_query', handlePreCheckout as any);
bot.on('message:successful_payment', handleSuccessfulPayment as any);

// Обработка текстовых и голосовых сообщений (V4 Voice Assistant)
bot.on('message:voice', handleVoice);
bot.on('message:video_note', handleVoice);
bot.on('message:text', handleMessage);

// Error handling
bot.catch((err) => {
  logger.error('Bot error:', err);
  captureException(err);
});

logger.info('Bot initialized successfully');

export default bot;
