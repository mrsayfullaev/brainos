/**
 * Обработчики согласия на обработку персональных данных
 */

import { InlineKeyboard } from 'grammy';
import { BotContext } from '../index';
import { giveConsent, deleteUser } from '../../database/queries/user';
import { i18n } from '../../localization';

async function askLanguage(ctx: BotContext) {
  const lang = ctx.user?.language ?? 'ru';
  const keyboard = new InlineKeyboard()
    .text(i18n.t('languages.ru', lang), 'lang:ru')
    .text(i18n.t('languages.en', lang), 'lang:en')
    .row()
    .text(i18n.t('languages.es', lang), 'lang:es')
    .text(i18n.t('languages.uz', lang), 'lang:uz')
    .row()
    .text(i18n.t('languages.ar', lang), 'lang:ar')
    .text(i18n.t('languages.tr', lang), 'lang:tr');

  await ctx.reply(
    i18n.t('onboarding.ask_language', lang),
    { reply_markup: keyboard }
  );
}

export async function handleConsentAgree(ctx: BotContext) {
  if (!ctx.user) return;

  await giveConsent(ctx.user.telegramId);
  ctx.user.consentGivenAt = new Date();

  ctx.session.onboardingStep = 'language';
  ctx.session.onboardingData = {};

  await ctx.answerCallbackQuery();
  await askLanguage(ctx);
}

export async function handleConsentDecline(ctx: BotContext) {
  if (!ctx.user) return;

  const lang = ctx.user.language;
  const telegramId = ctx.user.telegramId;

  await deleteUser(telegramId);

  await ctx.answerCallbackQuery();
  await ctx.reply(i18n.t('consent.declined_message', lang));
}
