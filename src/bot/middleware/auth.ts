import { findOrCreateUser } from '../../database/queries/user';
import { logger } from '../../utils/logger';
import type { Language } from '../../localization';
import { BotContext } from '../index';
import { bot } from '../index';
import { setUserCommands } from '../commands';
import { i18n } from '../../localization';

/**
 * Middleware для аутентификации и загрузки пользователя из БД
 * Создает нового пользователя, если его нет в базе
 * Заблокированные (отказавшиеся от согласия) не получают доступа
 */
export async function authMiddleware(ctx: BotContext, next: () => Promise<void>) {
  try {
    const telegramUser = ctx.from;

    if (!telegramUser) {
      logger.warn('No telegram user in context');
      return;
    }

    const telegramId = BigInt(telegramUser.id);
    const languageCode = telegramUser.language_code || 'ru';
    const supportedLanguages = ['ru', 'en', 'es', 'uz', 'ar', 'tr'];
    const language = supportedLanguages.includes(languageCode) ? languageCode : 'ru';

    const user = await findOrCreateUser(telegramId, language);

    if (!user) {
      await ctx.reply(i18n.t('consent.blocked_message', language as Language));
      return;
    }

    ctx.user = {
      ...user,
      language: user.language as Language,
      consentGivenAt: user.consentGivenAt ?? null,
    };

    await setUserCommands(bot, telegramUser.id, user.language);
    logger.debug(`User loaded: ${user.id} (Telegram: ${telegramId})`);

    await next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    await ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
}
