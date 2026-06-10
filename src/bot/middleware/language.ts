import { logger } from '../../utils/logger';
import { BotContext } from '../index';

/**
 * Middleware для установки языка из профиля пользователя
 * Используется для i18n
 */
export async function languageMiddleware(ctx: BotContext, next: () => Promise<void>) {
  try {
    if (ctx.user) {
      // Язык уже загружен из БД в authMiddleware
      logger.debug(`Language set to: ${ctx.user.language}`);
    }
    
    await next();
  } catch (error) {
    logger.error('Language middleware error:', error);
    await next();
  }
}
