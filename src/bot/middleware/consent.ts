/**
 * Middleware: блокирует использование бота до дачи согласия на обработку ПД
 * Пропускает только /start и callback consent:agree / consent:decline
 */

import { InlineKeyboard } from 'grammy';
import { BotContext } from '../index';
import { i18n } from '../../localization';

export async function consentMiddleware(ctx: BotContext, next: () => Promise<void>) {
  if (!ctx.user) return;

  if (ctx.user.consentGivenAt) {
    await next();
    return;
  }

  // Согласие ещё не дано — пропускаем только consent callbacks (для кнопок Согласен/Отказываюсь)
  const data = ctx.callbackQuery?.data;
  const isConsentCallback = data === 'consent:agree' || data === 'consent:decline';

  if (isConsentCallback) {
    await next();
    return;
  }

  // Любое действие (включая /start) — показываем экран согласия ОДИН раз
  const lang = ctx.user.language;
  const keyboard = new InlineKeyboard()
    .text(i18n.t('consent.agree', lang), 'consent:agree')
    .row()
    .text(i18n.t('consent.decline', lang), 'consent:decline');

  await ctx.reply(i18n.t('consent.text', lang), { reply_markup: keyboard, parse_mode: 'HTML' });
}
