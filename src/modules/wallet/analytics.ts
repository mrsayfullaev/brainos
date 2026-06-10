/**
 * Wallet Module - Analytics
 * Генерация статистики и инсайтов
 */

import { prisma } from '../../database/client';
import { logger } from '../../utils/logger';
import { raceAIProviders } from '../../ai/race';
import { 
  getWalletStats, 
  getTransactionsByPeriod,
  getBudgets,
  checkBudgetUsage 
} from './queries';
import { buildWeeklyDigestPrompt } from './prompts';
import type { WeeklyDigest } from './types';

/**
 * Генерирует еженедельный дайджест для пользователя
 */
export async function generateWeeklyDigest(
  userId: string,
  _userLanguage: string = 'ru'
): Promise<WeeklyDigest> {
  try {
    logger.info(`Generating weekly digest for user ${userId}`);
    
    // Определяем период (последние 7 дней)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    // Получаем статистику
    const stats = await getWalletStats(userId, startDate, endDate);
    
    // Проверяем бюджеты
    const budgets = await getBudgets(userId);
    const budgetAlerts = [];
    
    for (const budget of budgets) {
      if (budget.period === 'WEEKLY') {
        const usage = await checkBudgetUsage(userId, budget.category, 'WEEKLY');
        
        if (usage && usage.percentUsed > 80) {
          budgetAlerts.push({
            category: budget.category || 'other',
            spent: usage.spent,
            limit: usage.budget,
            percentUsed: usage.percentUsed,
          });
        }
      }
    }
    
    // Получаем пользователя для языка
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Генерируем AI инсайты
    const prompt = buildWeeklyDigestPrompt(user, stats, budgetAlerts);
    const aiResponse = await raceAIProviders(prompt, '', user.language);
    
    const digest: WeeklyDigest = {
      userId,
      startDate,
      endDate,
      stats,
      insights: aiResponse.winner.response,
      budgetAlerts,
    };
    
    logger.info(`Weekly digest generated for user ${userId}`);
    
    return digest;
  } catch (error) {
    logger.error('Error generating weekly digest:', error);
    throw error;
  }
}

/**
 * Анализирует траты по категориям и находит аномалии
 */
export async function analyzeSpendingPatterns(
  userId: string,
  days: number = 30
): Promise<{
  trends: Array<{
    category: string;
    average: number;
    current: number;
    change: number; // процент изменения
  }>;
  anomalies: Array<{
    category: string;
    amount: number;
    description: string;
    reason: string;
  }>;
}> {
  try {
    // Текущий период (последние X дней)
    const currentEnd = new Date();
    const currentStart = new Date();
    currentStart.setDate(currentEnd.getDate() - days);
    
    // Предыдущий период (для сравнения)
    const previousEnd = new Date(currentStart);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - days);
    
    // Получаем транзакции за оба периода
    const currentTxs = await getTransactionsByPeriod(userId, currentStart, currentEnd);
    const previousTxs = await getTransactionsByPeriod(userId, previousStart, previousEnd);
    
    // Группируем по категориям
    const currentByCategory: Record<string, number> = {};
    const previousByCategory: Record<string, number> = {};
    
    currentTxs
      .filter(tx => tx.type === 'EXPENSE')
      .forEach(tx => {
        const cat = tx.category || 'other';
        currentByCategory[cat] = (currentByCategory[cat] || 0) + Number(tx.amount);
      });
    
    previousTxs
      .filter(tx => tx.type === 'EXPENSE')
      .forEach(tx => {
        const cat = tx.category || 'other';
        previousByCategory[cat] = (previousByCategory[cat] || 0) + Number(tx.amount);
      });
    
    // Вычисляем тренды
    const trends = Object.keys({ ...currentByCategory, ...previousByCategory }).map(cat => {
      const current = currentByCategory[cat] || 0;
      const previous = previousByCategory[cat] || 0;
      const average = previous; // За предыдущий период
      const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      
      return { category: cat, average, current, change };
    });
    
    // Находим аномалии (траты выше обычного на 50%+)
    const anomalies = currentTxs
      .filter(tx => {
        if (tx.type !== 'EXPENSE') return false;
        
        const cat = tx.category || 'other';
        const avgForCategory = previousByCategory[cat] 
          ? previousByCategory[cat] / previousTxs.filter(t => t.category === cat).length 
          : 0;
        
        return avgForCategory > 0 && Number(tx.amount) > avgForCategory * 1.5;
      })
      .map(tx => ({
        category: tx.category || 'other',
        amount: Number(tx.amount),
        description: tx.description || 'Без описания',
        reason: 'Значительно выше среднего',
      }));
    
    return { trends, anomalies };
  } catch (error) {
    logger.error('Error analyzing spending patterns:', error);
    throw error;
  }
}

/**
 * Рассчитывает прогноз расходов на конец месяца
 */
export async function forecastMonthlyExpenses(
  userId: string
): Promise<{
  currentSpent: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyAverage: number;
  projectedTotal: number;
  projectedBalance: number;
}> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const daysElapsed = Math.ceil((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24));
    const daysInMonth = endOfMonth.getDate();
    const daysRemaining = daysInMonth - daysElapsed;
    
    // Получаем статистику за текущий месяц
    const stats = await getWalletStats(userId, startOfMonth, now);
    
    // Средний дневной расход
    const dailyAverage = daysElapsed > 0 ? stats.expenses / daysElapsed : 0;
    
    // Прогноз на конец месяца
    const projectedTotal = stats.expenses + (dailyAverage * daysRemaining);
    const projectedBalance = stats.income - projectedTotal;
    
    return {
      currentSpent: stats.expenses,
      daysElapsed,
      daysRemaining,
      dailyAverage,
      projectedTotal,
      projectedBalance,
    };
  } catch (error) {
    logger.error('Error forecasting monthly expenses:', error);
    throw error;
  }
}
