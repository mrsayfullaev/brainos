/**
 * Wallet Module - TypeScript Types
 * Финансовый модуль для отслеживания доходов и расходов
 */

// Типы транзакций
export type TransactionType = 'INCOME' | 'EXPENSE';

// Периоды бюджета
export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

// Категории расходов
export type ExpenseCategory = 
  | 'food'           // Еда
  | 'transport'      // Транспорт
  | 'entertainment'  // Развлечения
  | 'health'         // Здоровье
  | 'shopping'       // Покупки
  | 'utilities'      // Коммунальные услуги
  | 'education'      // Образование
  | 'other';         // Другое

// Результат парсинга транзакции
export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  description?: string;
  category?: ExpenseCategory;
  tags?: string[];
  currency?: string;
}

// Входные данные для создания транзакции
export interface TransactionInput {
  userId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  category?: ExpenseCategory;
  tags?: string[];
  currency?: string;
  date?: Date;
}

// Входные данные для создания бюджета
export interface BudgetInput {
  userId: string;
  category: ExpenseCategory;
  amount: number;
  period: BudgetPeriod;
  currency?: string;
}

// Статистика за период
export interface WalletStats {
  income: number;
  expenses: number;
  balance: number;
  categoryBreakdown: Record<string, number>;
  topExpenses: Array<{
    description: string;
    amount: number;
    category: string;
  }>;
}

// Данные для еженедельного дайджеста
export interface WeeklyDigest {
  userId: string;
  startDate: Date;
  endDate: Date;
  stats: WalletStats;
  insights?: string; // AI-генерированные инсайты
  budgetAlerts?: Array<{
    category: string;
    spent: number;
    limit: number;
    percentUsed: number;
  }>;
}

// Контекст модуля для AI промпта
export interface WalletContext {
  recentTransactions: Array<{
    type: TransactionType;
    amount: number;
    description?: string;
    category?: string;
    date: Date;
  }>;
  budgets?: Array<{
    category: string;
    amount: number;
    spent: number;
    remaining: number;
  }>;
  monthlyStats?: {
    income: number;
    expenses: number;
    balance: number;
  };
}
