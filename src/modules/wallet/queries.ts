/**
 * Wallet Module - Database Queries
 * CRUD операции с автоматическим шифрованием/дешифрованием
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import type { 
  TransactionInput, 
  BudgetInput,
  WalletStats 
} from './types';

// ==================== TRANSACTIONS ====================

/**
 * Создаёт новую транзакцию (доход/расход)
 */
export async function createTransaction(data: TransactionInput) {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        description: data.description ? encrypt(data.description) : null,
        category: data.category ? encrypt(data.category) : null,
        tags: data.tags || [],
        currency: data.currency || 'RUB',
        date: data.date || new Date(),
      },
    });
    
    logger.info(`Transaction created: ${transaction.id} (${data.type}, ${data.amount})`);
    
    // Возвращаем с дешифрованными данными
    return {
      ...transaction,
      description: transaction.description ? decrypt(transaction.description) : null,
      category: transaction.category ? decrypt(transaction.category) : null,
    };
  } catch (error) {
    logger.error('Error creating transaction:', error);
    throw error;
  }
}

/**
 * Получает транзакции пользователя
 */
export async function getTransactions(
  userId: string,
  limit: number = 10,
  offset: number = 0
) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });
    
    // Дешифруем данные
    return transactions.map(tx => ({
      ...tx,
      description: tx.description ? decrypt(tx.description) : null,
      category: tx.category ? decrypt(tx.category) : null,
    }));
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Получает транзакции за период
 */
export async function getTransactionsByPeriod(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });
    
    // Дешифруем данные
    return transactions.map(tx => ({
      ...tx,
      description: tx.description ? decrypt(tx.description) : null,
      category: tx.category ? decrypt(tx.category) : null,
    }));
  } catch (error) {
    logger.error('Error fetching transactions by period:', error);
    throw error;
  }
}

/**
 * Обновляет транзакцию
 */
export async function updateTransaction(
  id: string,
  data: Partial<TransactionInput>
) {
  try {
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        description: data.description ? encrypt(data.description) : undefined,
        category: data.category ? encrypt(data.category) : undefined,
      },
    });
    
    return {
      ...transaction,
      description: transaction.description ? decrypt(transaction.description) : null,
      category: transaction.category ? decrypt(transaction.category) : null,
    };
  } catch (error) {
    logger.error('Error updating transaction:', error);
    throw error;
  }
}

/**
 * Удаляет транзакцию
 */
export async function deleteTransaction(id: string) {
  try {
    await prisma.transaction.delete({ where: { id } });
    logger.info(`Transaction deleted: ${id}`);
  } catch (error) {
    logger.error('Error deleting transaction:', error);
    throw error;
  }
}

// ==================== BUDGETS ====================

/**
 * Создаёт бюджет для категории
 */
export async function createBudget(data: BudgetInput) {
  try {
    const encrypted = encrypt(data.category);
    if (!encrypted) {
      throw new Error('Failed to encrypt category');
    }
    
    const budget = await prisma.budget.create({
      data: {
        userId: data.userId,
        category: encrypted,
        amount: data.amount,
        period: data.period,
        currency: data.currency || 'RUB',
      },
    });
    
    logger.info(`Budget created: ${budget.id} (${data.category}, ${data.amount})`);
    
    return {
      ...budget,
      category: (budget.category ? decrypt(budget.category) : data.category) as string,
    };
  } catch (error) {
    logger.error('Error creating budget:', error);
    throw error;
  }
}

/**
 * Получает бюджеты пользователя
 */
export async function getBudgets(userId: string) {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId },
    });
    
    return budgets.map(budget => ({
      ...budget,
      category: (budget.category ? decrypt(budget.category) : '') as string,
    }));
  } catch (error) {
    logger.error('Error fetching budgets:', error);
    throw error;
  }
}

/**
 * Обновляет бюджет
 */
export async function updateBudget(
  id: string,
  data: Partial<BudgetInput>
) {
  try {
    const budget = await prisma.budget.update({
      where: { id },
      data: {
        amount: data.amount,
        period: data.period,
        currency: data.currency,
        category: data.category ? (encrypt(data.category) || undefined) : undefined,
      },
    });
    
    return {
      ...budget,
      category: (budget.category ? decrypt(budget.category) : '') as string,
    };
  } catch (error) {
    logger.error('Error updating budget:', error);
    throw error;
  }
}

/**
 * Удаляет бюджет
 */
export async function deleteBudget(id: string) {
  try {
    await prisma.budget.delete({ where: { id } });
    logger.info(`Budget deleted: ${id}`);
  } catch (error) {
    logger.error('Error deleting budget:', error);
    throw error;
  }
}

// ==================== ANALYTICS ====================

/**
 * Получает статистику за период
 */
export async function getWalletStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<WalletStats> {
  try {
    const transactions = await getTransactionsByPeriod(userId, startDate, endDate);
    
    // Подсчёт доходов и расходов
    const income = transactions
      .filter(tx => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    const expenses = transactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    // Разбивка по категориям
    const categoryBreakdown = transactions
      .filter(tx => tx.type === 'EXPENSE' && tx.category)
      .reduce((acc, tx) => {
        const cat = tx.category || 'other';
        acc[cat] = (acc[cat] || 0) + Number(tx.amount);
        return acc;
      }, {} as Record<string, number>);
    
    // Топ расходов
    const topExpenses = transactions
      .filter(tx => tx.type === 'EXPENSE')
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)
      .map(tx => ({
        description: tx.description || 'Без описания',
        amount: Number(tx.amount),
        category: tx.category || 'other',
      }));
    
    return {
      income,
      expenses,
      balance: income - expenses,
      categoryBreakdown,
      topExpenses,
    };
  } catch (error) {
    logger.error('Error calculating wallet stats:', error);
    throw error;
  }
}

/**
 * Проверяет использование бюджета для категории
 */
export async function checkBudgetUsage(
  userId: string,
  category: string,
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
) {
  try {
    // Получаем бюджет для категории
    const budgets = await getBudgets(userId);
    const budget = budgets.find(b => b.category === category && b.period === period);
    
    if (!budget) {
      return null;
    }
    
    // Определяем период
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'WEEKLY':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'MONTHLY':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'YEARLY':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    // Получаем транзакции за период
    const transactions = await getTransactionsByPeriod(userId, startDate, now);
    
    // Считаем расходы по категории
    const spent = transactions
      .filter(tx => tx.type === 'EXPENSE' && tx.category === category)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    return {
      budget: Number(budget.amount),
      spent,
      remaining: Number(budget.amount) - spent,
      percentUsed: (spent / Number(budget.amount)) * 100,
    };
  } catch (error) {
    logger.error('Error checking budget usage:', error);
    throw error;
  }
}
