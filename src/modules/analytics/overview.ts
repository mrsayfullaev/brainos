/**
 * V4 Analytics: агрегация данных для дашборда (wallet, tasks, habits, health)
 */

import { prisma } from '../../database/client';
import { captureException } from '../../utils/sentry';
import { logger } from '../../utils/logger';
import { getWalletStats } from '../wallet/queries';
import { getHabits } from '../habit/queries';

export interface AnalyticsOverview {
  userId: string;
  wallet: {
    income: number;
    expenses: number;
    balance: number;
    period: { from: string; to: string };
  };
  tasks: { total: number; todo: number; inProgress: number; done: number };
  habits: { total: number; active: number; completionsThisMonth: number };
  health: { entriesCount: number };
}

/**
 * Собирает сводку по пользователю для дашборда
 */
export async function getAnalyticsOverview(userId: string): Promise<AnalyticsOverview | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [walletStats, taskCounts, habitsList, healthCount] = await Promise.all([
    getWalletStats(userId, startOfMonth, now).catch((e) => {
      logger.error('getWalletStats failed:', e);
      captureException(e);
      return null;
    }),
    prisma.task
      .groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      })
      .then((groups) => {
        const map = Object.fromEntries(groups.map((g) => [g.status, g._count]));
        return {
          total: groups.reduce((s, g) => s + g._count, 0),
          todo: map['TODO'] ?? 0,
          inProgress: map['IN_PROGRESS'] ?? 0,
          done: map['DONE'] ?? 0,
        };
      }),
    getHabits(userId, true).then((list) => {
      const total = list.length;
      const completionsThisMonth = list.reduce((sum, h) => {
        const inMonth = h.completions.filter(
          (c) => new Date(c.date) >= startOfMonth && new Date(c.date) <= now
        ).length;
        return sum + inMonth;
      }, 0);
      return { total, active: total, completionsThisMonth };
    }),
    prisma.healthEntry.count({ where: { userId } }),
  ]);

  return {
    userId,
    wallet: walletStats
      ? {
          income: walletStats.income,
          expenses: walletStats.expenses,
          balance: walletStats.balance,
          period: {
            from: startOfMonth.toISOString().slice(0, 10),
            to: now.toISOString().slice(0, 10),
          },
        }
      : {
          income: 0,
          expenses: 0,
          balance: 0,
          period: {
            from: startOfMonth.toISOString().slice(0, 10),
            to: now.toISOString().slice(0, 10),
          },
        },
    tasks: taskCounts,
    habits: habitsList,
    health: { entriesCount: healthCount },
  };
}
