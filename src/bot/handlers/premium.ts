/**
 * V4 Premium: команда /premium и кнопки оформления подписки (Telegram Stars)
 */

import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../index';
import {
  getOrCreatePlanSubscription,
  cancelPlanAtPeriodEnd,
  sendStarsInvoice,
  sendAddUserInvoice,
} from '../../modules/premium';
import { logger } from '../../utils/logger';
import { i18n } from '../../localization';
import { getDocsPageUrl } from '../../utils/docs-url';

const TIER_LABELS: Record<string, string> = { FREE: 'Free', PRO: 'Pro', TEAM: 'Team' };

function formatPeriodEnd(date: Date | null, lang: string): string {
  if (!date) return '';
  const d = date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return lang === 'ru' ? `Доступ до ${d}.` : `Access until ${d}.`;
}

export async function handlePremium(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('Ошибка авторизации.');
    return;
  }

  const plan = await getOrCreatePlanSubscription(ctx.user.id);
  const lang = ctx.user.language ?? 'ru';
  const tierLabel = TIER_LABELS[plan.tier] ?? plan.tier;

  let text =
    lang === 'ru'
      ? `Ваш тариф: **${tierLabel}**\n\n`
      : `Your plan: **${tierLabel}**\n\n`;

  if (plan.tier === 'FREE') {
    text +=
      lang === 'ru'
        ? 'Pro и Team — доступ ко всем модулям и безлимит AI. Оплата через Telegram Stars.\n\n'
        : 'Pro and Team — access to all modules and unlimited AI. Pay with Telegram Stars.\n\n';
    text += lang === 'ru' ? 'Выберите тариф:' : 'Choose a plan:';
  } else {
    if (plan.currentPeriodEnd) {
      text += formatPeriodEnd(plan.currentPeriodEnd, lang) + '\n\n';
    }
    if (plan.tier === 'TEAM') {
      text += (lang === 'ru' ? `Мест в команде: ${plan.teamSize}.` : `Team slots: ${plan.teamSize}.`) + '\n\n';
    }
    text += lang === 'ru' ? 'Спасибо за подписку!' : 'Thank you for your subscription!';
  }

  text += '\n\n' + i18n.t('premium.offer_link_label', lang) + ' ' + getDocsPageUrl(lang, 'offer');

  const replyKeyboard = new InlineKeyboard();
  if (plan.tier === 'FREE') {
    replyKeyboard.text(lang === 'ru' ? 'Оформить Pro' : 'Get Pro', 'premium:pro').row();
    replyKeyboard.text(lang === 'ru' ? 'Оформить Team' : 'Get Team', 'premium:team').row();
  } else {
    // Кнопка отмены — всегда для PRO и TEAM (в т.ч. после допокупки мест)
    if (plan.tier === 'PRO' || plan.tier === 'TEAM') {
      replyKeyboard.text(lang === 'ru' ? 'Отменить подписку' : 'Cancel subscription', 'premium:cancel').row();
    }
    if (plan.tier === 'PRO') {
      replyKeyboard.text(lang === 'ru' ? 'Перейти на Team' : 'Switch to Team', 'premium:team').row();
    }
    if (plan.tier === 'TEAM') {
      replyKeyboard.text(lang === 'ru' ? 'Добавить пользователя' : 'Add user', 'premium:add_user').row();
    }
  }

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup:
      replyKeyboard.inline_keyboard.length > 0 ? replyKeyboard : undefined,
  });
}

export async function handlePremiumCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.user) return;

  await ctx.answerCallbackQuery({ text: '…' });

  if (data === 'premium:cancel') {
    const planBefore = await getOrCreatePlanSubscription(ctx.user.id);
    if (planBefore.cancelAtPeriodEnd) {
      const lang = ctx.user.language ?? 'ru';
      const end = planBefore.currentPeriodEnd
        ? formatPeriodEnd(planBefore.currentPeriodEnd, lang)
        : '';
      await ctx.reply(
        lang === 'ru'
          ? `Подписка уже отменена. ${end} После этой даты тариф станет Free.`
          : `Subscription already cancelled. ${end} After that date your plan will be Free.`
      );
      return;
    }
    const ok = await cancelPlanAtPeriodEnd(ctx.user.id);
    const lang = ctx.user.language ?? 'ru';
    if (ok) {
      const plan = await getOrCreatePlanSubscription(ctx.user.id);
      const end = plan.currentPeriodEnd
        ? formatPeriodEnd(plan.currentPeriodEnd, lang)
        : '';
      await ctx.reply(
        lang === 'ru'
          ? `Подписка отменена. ${end} После этой даты тариф станет Free.`
          : `Subscription cancelled. ${end} After that date your plan will be Free.`
      );
    } else {
      await ctx.reply(
        lang === 'ru'
          ? 'Не удалось отменить подписку. Обратитесь в поддержку.'
          : 'Could not cancel subscription. Please contact support.'
      );
    }
    return;
  }

  if (data === 'premium:add_user') {
    const plan = await getOrCreatePlanSubscription(ctx.user.id);
    if (plan.tier !== 'TEAM') {
      await ctx.reply(ctx.user.language === 'ru' ? 'Доступно только для тарифа Team.' : 'Available for Team plan only.');
      return;
    }
    const ok = await sendAddUserInvoice(ctx as any, ctx.user.id);
    if (!ok) {
      await ctx.reply(ctx.user.language === 'ru' ? 'Не удалось отправить счёт.' : 'Failed to send invoice.');
    }
    return;
  }

  const tier = data === 'premium:pro' ? 'PRO' : data === 'premium:team' ? 'TEAM' : null;
  if (!tier) return;

  const ok = await sendStarsInvoice(ctx as any, ctx.user.id, tier);
  if (!ok) {
    await ctx.reply(ctx.user.language === 'ru' ? 'Не удалось отправить счёт. Попробуйте позже.' : 'Failed to send invoice. Try again later.');
    return;
  }
  logger.info('Stars invoice sent', { userId: ctx.user.id, tier });
}
