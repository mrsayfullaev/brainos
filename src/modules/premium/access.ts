/**
 * V4 Premium: проверка доступа к модулям и лимиты AI
 */

import { prisma } from '../../database/client';
import type { User, PlanSubscription, SubTier } from '@prisma/client';
import { getOrCreatePlanSubscription } from './queries';

/** Модули, доступные на Free по умолчанию (5 базовых) */
const FREE_FIXED_MODULES = ['task', 'note', 'wallet', 'health', 'contact'] as const;

/** Все модули (V2 + V3). V4 модули пока не добавлены в ModuleName. */
export const ALL_MODULES = [
  'task', 'remind', 'note', 'wallet', 'sub', 'savings', 'debt',
  'health', 'workout', 'sleep', 'water', 'food', 'vocab', 'book',
  'contact', 'news', 'idea', 'trip', 'place', 'buy', 'quote',
  'kb', 'habit', 'invest', 'course', 'email', 'later', 'project', 'car', 'pet',
] as const;

export type ModuleId = (typeof ALL_MODULES)[number];

/**
 * Возвращает список модулей, доступных пользователю по тарифу.
 * Free: 5 базовых + 1 бонусный. Pro/Team: все.
 */
export async function getAccessibleModules(
  user: User & { planSubscription?: PlanSubscription | null }
): Promise<ModuleId[]> {
  let plan = user.planSubscription;
  if (!plan) {
    plan = await getOrCreatePlanSubscription(user.id);
  }

  const tier: SubTier = plan?.tier ?? 'FREE';
  const bonusModule = plan?.bonusModule as ModuleId | null;

  if (tier === 'PRO' || tier === 'TEAM') {
    return [...ALL_MODULES];
  }

  // FREE: 5 фиксированных + 1 бонусный
  const modules = new Set<ModuleId>([...FREE_FIXED_MODULES]);
  if (bonusModule && ALL_MODULES.includes(bonusModule)) {
    modules.add(bonusModule);
  }
  return Array.from(modules);
}

/** Лимит AI-запросов в месяц для Free */
const FREE_AI_LIMIT_PER_MONTH = 100;

/**
 * Проверяет, есть ли у пользователя доступ к модулю.
 * @param user — пользователь (planSubscription можно не подгружать, подгрузится при необходимости)
 * @param module — идентификатор модуля (task, wallet, kb, ...)
 */
export async function canAccessModule(
  user: User & { planSubscription?: PlanSubscription | null },
  module: ModuleId
): Promise<boolean> {
  let plan = user.planSubscription;
  if (!plan) {
    plan = await getOrCreatePlanSubscription(user.id);
  }

  const tier: SubTier = plan?.tier ?? 'FREE';
  const bonusModule = plan?.bonusModule ?? null;

  if (tier === 'PRO' || tier === 'TEAM') {
    return ALL_MODULES.includes(module);
  }

  // FREE: 5 фиксированных + 1 бонусный
  if ((FREE_FIXED_MODULES as readonly ModuleId[]).includes(module)) return true;
  if (bonusModule && bonusModule === module) return true;
  return false;
}

/**
 * Проверяет, не превышен ли лимит AI-запросов за текущий месяц (для Free).
 * Pro/Team — без лимита.
 */
export async function checkAIRequestLimit(userId: string): Promise<boolean> {
  const plan = await prisma.planSubscription.findUnique({
    where: { userId },
  });
  if (plan?.tier === 'PRO' || plan?.tier === 'TEAM') {
    return true;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.aIResponse.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  });

  return count < FREE_AI_LIMIT_PER_MONTH;
}

/**
 * Возвращает количество оставшихся AI-запросов в месяце для Free (или null = безлимит).
 */
export async function getRemainingAIRequests(userId: string): Promise<number | null> {
  const plan = await prisma.planSubscription.findUnique({
    where: { userId },
  });
  if (plan?.tier === 'PRO' || plan?.tier === 'TEAM') return null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.aIResponse.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  });

  const remaining = FREE_AI_LIMIT_PER_MONTH - count;
  return Math.max(0, remaining);
}
