/**
 * V4 Premium: Telegram Stars (XTR) — оплата через встроенный инвойс
 */

import type { Context } from 'grammy';
import { prisma } from '../../database/client';
import { updatePlanTier, incrementTeamSize } from './queries';
import type { SubTier } from '@prisma/client';
import { logger } from '../../utils/logger';

/** 1 Star ≈ 1.5₽ (округление вверх) */
const RUB_PER_STAR = 1.5;

export function rubToStars(rub: number): number {
  return Math.max(1, Math.ceil(rub / RUB_PER_STAR));
}

/** Сумма Stars для тарифа (Pro: 4₽≈33, Team: 10₽≈66, доп. пользователь: +1₽≈13) */
export function getSubscriptionStarsAmount(
  tier: Exclude<SubTier, 'FREE'>,
  teamSize: number = 1
): number {
  if (tier === 'PRO') return rubToStars(4);
  const base = rubToStars(10);
  const extra = Math.max(0, teamSize - 1) * rubToStars(1);
  return base + extra;
}

/** Формат payload для связи платежа с подпиской: sub_${userId}_${tier}_${timestamp} */
function buildPayload(userId: string, tier: Exclude<SubTier, 'FREE'>): string {
  return `sub_${userId}_${tier}_${Date.now()}`;
}

/** Payload для покупки доп. пользователя Team: add_${userId}_${timestamp} */
function buildAddUserPayload(userId: string): string {
  return `add_${userId}_${Date.now()}`;
}

/** Парсит payload, возвращает { userId, tier } или null */
function parsePayload(payload: string): { userId: string; tier: Exclude<SubTier, 'FREE'> } | null {
  const match = payload.match(/^sub_([a-z0-9]+)_(PRO|TEAM)_(\d+)$/);
  if (!match) return null;
  return { userId: match[1], tier: match[2] as Exclude<SubTier, 'FREE'> };
}

/** Парсит payload доп. пользователя: add_${userId}_${timestamp} */
function parseAddUserPayload(payload: string): { userId: string } | null {
  const match = payload.match(/^add_([a-z0-9]+)_(\d+)$/);
  if (!match) return null;
  return { userId: match[1] };
}

/**
 * Отправляет инвойс Telegram Stars в чат
 */
export async function sendStarsInvoice(
  ctx: Context,
  userId: string,
  tier: Exclude<SubTier, 'FREE'>
): Promise<boolean> {
  const chatId = ctx.chat?.id;
  if (!chatId) return false;

  const stars = getSubscriptionStarsAmount(tier);
  const payload = buildPayload(userId, tier);
  const lang = (ctx as any).user?.language ?? 'ru';

  const title = tier === 'PRO' ? 'BrainOS Pro' : 'BrainOS Team';
  const description =
    lang === 'ru'
      ? tier === 'PRO'
        ? 'Подписка Pro на 1 месяц — все модули и безлимит AI'
        : 'Подписка Team на 1 месяц — входит до 3 пользователей, можно докупить'
      : tier === 'PRO'
        ? 'Pro subscription for 1 month — all modules and unlimited AI'
        : 'Team subscription for 1 month — up to 3 users included, more can be added';

  try {
    await ctx.api.sendInvoice(chatId, title, description, payload, 'XTR', [
      { label: title, amount: stars },
    ], {
      provider_token: '',
    });
    logger.info('Stars invoice sent', { userId, tier, stars });
    return true;
  } catch (e) {
    logger.error('Failed to send Stars invoice', { userId, tier, error: e });
    return false;
  }
}

/** Отправляет инвойс на доп. пользователя для Team */
export async function sendAddUserInvoice(ctx: Context, userId: string): Promise<boolean> {
  const chatId = ctx.chat?.id;
  if (!chatId) return false;

  const stars = rubToStars(1); // 1₽ за доп. пользователя
  const payload = buildAddUserPayload(userId);
  const lang = (ctx as any).user?.language ?? 'ru';
  const title = lang === 'ru' ? 'Доп. пользователь Team' : 'Extra Team user';
  const description =
    lang === 'ru'
      ? 'Один дополнительный пользователь в тарифе Team на текущий период'
      : 'One additional user for Team plan for current period';

  try {
    await ctx.api.sendInvoice(chatId, title, description, payload, 'XTR', [
      { label: title, amount: stars },
    ], {
      provider_token: '',
    });
    logger.info('Stars add-user invoice sent', { userId, stars });
    return true;
  } catch (e) {
    logger.error('Failed to send add-user invoice', { userId, error: e });
    return false;
  }
}

/** Обработчик pre_checkout_query — проверяем payload и подтверждаем */
export async function handlePreCheckout(ctx: Context): Promise<void> {
  const query = (ctx as any).preCheckoutQuery;
  if (!query) return;

  const payload = query.invoice_payload;
  const parsedSub = parsePayload(payload);
  const parsedAdd = parseAddUserPayload(payload);

  if (parsedSub) {
    const user = await prisma.user.findUnique({
      where: { id: parsedSub.userId },
      select: { telegramId: true },
    });
    if (!user || user.telegramId !== BigInt(query.from.id)) {
      await ctx.answerPreCheckoutQuery(false, 'Оплата доступна только владельцу заказа.');
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
    return;
  }
  if (parsedAdd) {
    const user = await prisma.user.findUnique({
      where: { id: parsedAdd.userId },
      select: { telegramId: true },
    });
    if (!user || user.telegramId !== BigInt(query.from.id)) {
      await ctx.answerPreCheckoutQuery(false, 'Оплата доступна только владельцу заказа.');
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
    return;
  }

  await ctx.answerPreCheckoutQuery(false, 'Неверные данные заказа. Попробуйте снова.');
}

/** Обработчик successful_payment — активируем подписку или доп. пользователя */
export async function handleSuccessfulPayment(ctx: Context): Promise<void> {
  const msg = (ctx as any).message;
  const payment = msg?.successful_payment;
  if (!payment || payment.currency !== 'XTR') return;

  const payload = payment.invoice_payload;
  const parsedSub = parsePayload(payload);
  const parsedAdd = parseAddUserPayload(payload);

  if (parsedSub) {
    const user = await prisma.user.findUnique({
      where: { id: parsedSub.userId },
      select: { telegramId: true },
    });
    if (!user || user.telegramId !== BigInt(msg.from?.id ?? 0)) {
      logger.warn('Payer mismatch on successful payment', { userId: parsedSub.userId, fromId: msg.from?.id });
      return;
    }
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await updatePlanTier(parsedSub.userId, parsedSub.tier, null, null, periodEnd, now);
    logger.info('Plan activated via Stars', { userId: parsedSub.userId, tier: parsedSub.tier });
    const lang = (ctx as any).user?.language ?? 'ru';
    const thanks = lang === 'ru' ? 'Спасибо! Подписка активирована.' : 'Thank you! Subscription activated.';
    await ctx.reply(thanks);
    return;
  }

  if (parsedAdd) {
    const user = await prisma.user.findUnique({
      where: { id: parsedAdd.userId },
      select: { telegramId: true },
    });
    if (!user || user.telegramId !== BigInt(msg.from?.id ?? 0)) {
      logger.warn('Payer mismatch on add-user payment', { userId: parsedAdd.userId });
      return;
    }
    const newSize = await incrementTeamSize(parsedAdd.userId);
    if (newSize !== null) {
      logger.info('Team size increased via Stars', { userId: parsedAdd.userId, teamSize: newSize });
      const lang = (ctx as any).user?.language ?? 'ru';
      const thanks =
        lang === 'ru'
          ? `Готово! Мест в Team: ${newSize}.`
          : `Done! Team slots: ${newSize}.`;
      await ctx.reply(thanks);
    }
  }
}
