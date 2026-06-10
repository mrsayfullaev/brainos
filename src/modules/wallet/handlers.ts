/**
 * Wallet Module - Handlers
 * Бизнес-логика обработки сообщений о транзакциях
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { parseTransaction } from './parser';
import { 
  createTransaction, 
  getTransactions,
  // getBudgets,  // TODO: Use for budget warnings
  checkBudgetUsage,
  getWalletStats
} from './queries';
import { buildWalletPrompt } from './prompts';
import { logger } from '../../utils/logger';

/**
 * Обработчик сообщений для Wallet модуля
 */
export async function handleWalletMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  try {
    logger.info(`Wallet module: processing message for user ${user.id}`);
    
    // 1. Парсим транзакцию (GigaChat → OpenAI)
    const parsed = await parseTransaction(message, user.language);
    
    logger.debug(`Parsed transaction: ${JSON.stringify(parsed)}`);
    
    // 2. Сохраняем в базу данных (автоматически шифруется)
    const transaction = await createTransaction({
      userId: user.id,
      ...parsed,
    });
    
    // 3. Получаем контекст для AI
    const recentTransactions = await getTransactions(user.id, 5);
    // TODO: Use budgets for budget warnings
    // const budgets = await getBudgets(user.id);
    
    // 4. Проверяем бюджет для категории (если есть)
    let budgetAlert = null;
    if (parsed.category && parsed.type === 'EXPENSE') {
      const budgetUsage = await checkBudgetUsage(user.id, parsed.category, 'MONTHLY');
      
      // Предупреждение если потрачено > 80% бюджета
      if (budgetUsage && budgetUsage.percentUsed > 80) {
        budgetAlert = {
          category: parsed.category,
          spent: budgetUsage.spent,
          limit: budgetUsage.budget,
          percentUsed: budgetUsage.percentUsed,
          remaining: budgetUsage.remaining,
        };
      }
    }
    
    // 5. Получаем статистику за текущий месяц
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyStats = await getWalletStats(user.id, startOfMonth, now);
    
    // 6. Строим промпт для AI
    const modulePrompt = buildWalletPrompt({
      user,
      transaction: {
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        category: parsed.category,
      },
      recentTransactions: recentTransactions.slice(0, 5).map(tx => ({
        type: tx.type,
        amount: Number(tx.amount),
        description: tx.description || undefined,
        category: tx.category || undefined,
        date: tx.date,
      })),
      budgetAlert,
      monthlyStats: {
        income: monthlyStats.income,
        expenses: monthlyStats.expenses,
        balance: monthlyStats.balance,
      },
    });
    
    logger.info('Wallet module: successfully processed transaction');
    
    return {
      modulePrompt,
      data: transaction,
    };
  } catch (error) {
    logger.error('Error in wallet module handler:', error);
    
    // Возвращаем базовый промпт при ошибке
    return {
      modulePrompt: `
You are helping with expense tracking.
There was an error processing the transaction.
Please acknowledge the error and ask the user to try again.
Respond in ${user.language}.
      `.trim(),
    };
  }
}

/**
 * Обработчик команды "покажи расходы" / "show expenses"
 */
export async function handleShowExpenses(
  _ctx: Context,
  user: User,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<ModuleResult> {
  try {
    // Определяем период
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    // Получаем статистику
    const stats = await getWalletStats(user.id, startDate, now);
    
    // Строим промпт для AI
    const modulePrompt = `
You are a financial assistant. Present this expense report to the user:

Period: ${period === 'day' ? 'Today' : period === 'week' ? 'Last 7 days' : 'This month'}
Income: ${stats.income} RUB
Expenses: ${stats.expenses} RUB
Balance: ${stats.balance > 0 ? '+' : ''}${stats.balance} RUB

Category Breakdown:
${Object.entries(stats.categoryBreakdown)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amount]) => `- ${cat}: ${amount} RUB`)
  .join('\n')}

Top Expenses:
${stats.topExpenses.map((exp, i) => `${i + 1}. ${exp.description} - ${exp.amount} RUB`).join('\n')}

Present this information in a clear, friendly way in ${user.language}.
Add 1-2 brief insights or observations about their spending.
    `.trim();
    
    return {
      modulePrompt,
      data: stats,
    };
  } catch (error) {
    logger.error('Error showing expenses:', error);
    throw error;
  }
}

/**
 * Обработчик команды установки бюджета
 */
export async function handleSetBudget(
  _ctx: Context,
  user: User,
  category: string,
  amount: number,
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY' = 'MONTHLY'
): Promise<ModuleResult> {
  try {
    // Создаём или обновляем бюджет
    // TODO: implement upsert logic
    
    const modulePrompt = `
You are a financial assistant.
User has set a budget:
Category: ${category}
Amount: ${amount} RUB
Period: ${period}

Confirm this budget setting and provide encouragement in ${user.language}.
    `.trim();
    
    return { modulePrompt };
  } catch (error) {
    logger.error('Error setting budget:', error);
    throw error;
  }
}
