/**
 * V4 Premium: работа с подпиской (PlanSubscription)
 */

import { prisma } from '../../database/client';
import type { SubTier, SubStatus } from '@prisma/client';

/**
 * Создаёт или возвращает подписку по умолчанию (FREE) для пользователя.
 * Если у платной подписки истёк период — сбрасывает на FREE.
 */
export async function getOrCreatePlanSubscription(userId: string) {
  let plan = await prisma.planSubscription.findUnique({
    where: { userId },
  });
  if (!plan) {
    plan = await prisma.planSubscription.create({
      data: {
        userId,
        tier: 'FREE',
        status: 'ACTIVE',
      },
    });
    return plan;
  }
  if (plan.tier !== 'FREE' && plan.currentPeriodEnd && plan.currentPeriodEnd <= new Date()) {
    await prisma.planSubscription.update({
      where: { userId },
      data: {
        tier: 'FREE',
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        teamSize: 1,
      },
    });
    plan = await prisma.planSubscription.findUnique({ where: { userId } })!;
  }
  // Тариф Team по умолчанию включает 3 места; исправляем старые записи с 1
  if (plan!.tier === 'TEAM' && plan!.teamSize < 3) {
    await prisma.planSubscription.update({
      where: { userId },
      data: { teamSize: 3 },
    });
    plan = await prisma.planSubscription.findUnique({ where: { userId } })!;
  }
  return plan!;
}

/** Отменить подписку в конце текущего периода (доступ до currentPeriodEnd) */
export async function cancelPlanAtPeriodEnd(userId: string): Promise<boolean> {
  const plan = await prisma.planSubscription.findUnique({
    where: { userId },
    select: { tier: true, currentPeriodEnd: true },
  });
  if (!plan || plan.tier === 'FREE' || !plan.currentPeriodEnd) return false;
  await prisma.planSubscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true },
  });
  return true;
}

/** Увеличить число мест в Team (доп. пользователи) */
export async function incrementTeamSize(userId: string): Promise<number | null> {
  const plan = await prisma.planSubscription.findUnique({
    where: { userId },
    select: { tier: true, teamSize: true },
  });
  if (!plan || plan.tier !== 'TEAM') return null;
  const newSize = plan.teamSize + 1;
  await prisma.planSubscription.update({
    where: { userId },
    data: { teamSize: newSize },
  });
  return newSize;
}

/** Модули, которые можно выбрать как бонусный (не входят в 5 базовых) */
const BONUS_ELIGIBLE_MODULES = [
  'remind', 'kb', 'habit', 'invest', 'email', 'sub', 'book', 'news',
  'savings', 'debt', 'workout', 'sleep', 'water', 'food', 'vocab',
  'idea', 'trip', 'place', 'buy', 'quote', 'later', 'project', 'car', 'pet', 'course',
];

/**
 * Устанавливает бонусный модуль для Free (один дополнительный модуль)
 */
export async function setBonusModule(userId: string, module: string): Promise<void> {
  if (!BONUS_ELIGIBLE_MODULES.includes(module)) return;
  await prisma.planSubscription.upsert({
    where: { userId },
    create: {
      userId,
      tier: 'FREE',
      status: 'ACTIVE',
      bonusModule: module,
    },
    update: { bonusModule: module },
  });
}

/**
 * Обновляет тариф (для Telegram Stars и ручной активации)
 */
/** Количество мест в тарифе Team по умолчанию (входит в подписку) */
const TEAM_DEFAULT_SEATS = 3;

export async function updatePlanTier(
  userId: string,
  tier: SubTier,
  stripeCustomerId?: string | null,
  stripeSubscriptionId?: string | null,
  currentPeriodEnd?: Date | null,
  currentPeriodStart?: Date | null,
  status?: SubStatus
): Promise<void> {
  const now = new Date();
  const teamSize = tier === 'TEAM' ? TEAM_DEFAULT_SEATS : undefined;
  await prisma.planSubscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      status: status ?? 'ACTIVE',
      teamSize: tier === 'TEAM' ? TEAM_DEFAULT_SEATS : 1,
      stripeCustomerId: stripeCustomerId ?? undefined,
      stripeSubscriptionId: stripeSubscriptionId ?? undefined,
      currentPeriodStart: currentPeriodStart ?? now,
      currentPeriodEnd: currentPeriodEnd ?? undefined,
    },
    update: {
      tier,
      ...(teamSize !== undefined && { teamSize }),
      ...(status !== undefined && { status: status }),
      ...(stripeCustomerId !== undefined && { stripeCustomerId: stripeCustomerId }),
      ...(stripeSubscriptionId !== undefined && { stripeSubscriptionId: stripeSubscriptionId }),
      ...(currentPeriodEnd !== undefined && { currentPeriodEnd: currentPeriodEnd }),
      ...(currentPeriodStart !== undefined && { currentPeriodStart: currentPeriodStart }),
    },
  });
}
