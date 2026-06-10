/**
 * V4 AI Predictions — прогнозы по бюджету, привычкам, портфелю
 */

import { getTransactionsByPeriod, getBudgets } from '../wallet/queries';
import { getHabits, getStreak } from '../habit/queries';
import { getPortfolio } from '../invest/queries';
import { logger } from '../../utils/logger';

export type PredictionItem = {
  type: string;
  severity: 'high' | 'medium' | 'info';
  message: string;
};

function getDaysLeftInMonth(): number {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(0, last.getDate() - now.getDate());
}

function getDaysPassedInMonth(): number {
  const now = new Date();
  return now.getDate();
}

/**
 * Генерирует прогнозы для пользователя (бюджет, привычки, опционально портфель)
 */
export async function generatePredictions(userId: string): Promise<PredictionItem[]> {
  const predictions: PredictionItem[] = [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const txs = await getTransactionsByPeriod(userId, startOfMonth, now);
    const expenses = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const daysPassed = getDaysPassedInMonth();
    const daysLeft = getDaysLeftInMonth();
    const avgDaily = daysPassed > 0 ? expenses / daysPassed : 0;
    const projected = avgDaily * (daysPassed + daysLeft);

    const budgets = await getBudgets(userId);
    const totalBudget = budgets
      .filter((b) => b.period === 'MONTHLY')
      .reduce((s, b) => s + Number(b.amount), 0);
    if (totalBudget > 0 && projected > totalBudget) {
      const over = Math.round(projected - totalBudget);
      predictions.push({
        type: 'budget_alert',
        severity: 'high',
        message: `Бюджет: при текущих расходах к концу месяца перерасход ~${over} ₽. Рекомендуется снизить траты.`,
      });
    }
  } catch (e) {
    logger.debug('Predictions: wallet data skipped', e);
  }

  try {
    const habits = await getHabits(userId, true);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    for (const habit of habits) {
      const stats = await getStreak(habit.id);
      if (stats.currentStreak < 3) continue;
      const completedDates = new Set(
        habit.completions.map((c) => new Date(c.date).toISOString().slice(0, 10))
      );
      if (!completedDates.has(today) && !completedDates.has(yesterday)) {
        predictions.push({
          type: 'habit_risk',
          severity: 'medium',
          message: `Привычка «${habit.name}»: серия ${stats.currentStreak} дн. под угрозой — не отмечено вчера/сегодня.`,
        });
      }
    }
  } catch (e) {
    logger.debug('Predictions: habits skipped', e);
  }

  try {
    const portfolio = await getPortfolio(userId);
    if (portfolio.holdings.length > 0) {
      const pl = portfolio.profitLossPercent;
      const trend = pl >= 0 ? '+' : '-';
      predictions.push({
        type: 'investment',
        severity: 'info',
        message: `${trend} Портфель: P/L ${portfolio.profitLossPercent.toFixed(1)}% ($${portfolio.profitLoss.toFixed(2)}).`,
      });
    }
  } catch (e) {
    logger.debug('Predictions: invest skipped', e);
  }

  return predictions;
}
