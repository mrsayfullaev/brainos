/**
 * Wallet Module - AI Prompts
 * Шаблоны промптов для обогащения контекста AI
 */

import type { User } from '@prisma/client';

interface WalletPromptContext {
  user: User;
  transaction: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description?: string;
    category?: string;
  };
  recentTransactions: Array<{
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description?: string;
    category?: string;
    date: Date;
  }>;
  budgetAlert?: {
    category: string;
    spent: number;
    limit: number;
    percentUsed: number;
    remaining: number;
  } | null;
  monthlyStats: {
    income: number;
    expenses: number;
    balance: number;
  };
}

/**
 * Строит обогащённый промпт для AI после добавления транзакции
 */
export function buildWalletPrompt(context: WalletPromptContext): string {
  const { user, transaction, recentTransactions, budgetAlert, monthlyStats } = context;
  
  const parts: string[] = [];
  
  // Заголовок модуля
  parts.push(`
=== WALLET MODULE CONTEXT ===
You are helping with personal finance tracking.
`);
  
  // Информация о транзакции
  parts.push(`
CURRENT TRANSACTION:
Type: ${transaction.type}
Amount: ${transaction.amount} RUB
${transaction.description ? `Description: ${transaction.description}` : ''}
${transaction.category ? `Category: ${transaction.category}` : ''}
`);
  
  // Недавние транзакции
  if (recentTransactions.length > 0) {
    parts.push(`
RECENT TRANSACTIONS (last 5):
${recentTransactions.map((tx, i) => 
  `${i + 1}. ${tx.type === 'INCOME' ? '+' : '-'}${tx.amount} RUB${tx.description ? ` - ${tx.description}` : ''}${tx.category ? ` (${tx.category})` : ''}`
).join('\n')}
`);
  }
  
  // Статистика за месяц
  parts.push(`
THIS MONTH STATS:
Income: ${monthlyStats.income} RUB
Expenses: ${monthlyStats.expenses} RUB
Balance: ${monthlyStats.balance > 0 ? '+' : ''}${monthlyStats.balance} RUB
`);
  
  // Предупреждение о бюджете
  if (budgetAlert) {
    parts.push(`
⚠️ BUDGET ALERT:
Category: ${budgetAlert.category}
Budget: ${budgetAlert.limit} RUB
Spent: ${budgetAlert.spent} RUB (${budgetAlert.percentUsed.toFixed(0)}%)
Remaining: ${budgetAlert.remaining} RUB

User is close to or over budget limit for this category!
`);
  }
  
  // Инструкции для AI
  parts.push(`
YOUR TASK:
1. Confirm the transaction was recorded
2. Provide the current balance for context
${budgetAlert ? '3. **IMPORTANT:** Warn about budget usage!' : '3. Give a brief, friendly insight about their spending'}
4. Keep it SHORT (2-3 sentences max)
5. Respond in ${user.language}

DO NOT:
- Give unsolicited financial advice
- Be judgemental
- Be overly verbose
`);
  
  return parts.join('\n').trim();
}

/**
 * Промпт для еженедельного дайджеста
 */
export function buildWeeklyDigestPrompt(
  user: User,
  stats: {
    income: number;
    expenses: number;
    balance: number;
    categoryBreakdown: Record<string, number>;
    topExpenses: Array<{
      description: string;
      amount: number;
      category: string;
    }>;
  },
  budgetAlerts?: Array<{
    category: string;
    spent: number;
    limit: number;
    percentUsed: number;
  }>
): string {
  return `
You are a personal finance advisor. Generate a weekly financial summary for the user.

WEEKLY STATS:
Income: ${stats.income} RUB
Expenses: ${stats.expenses} RUB
Balance: ${stats.balance > 0 ? '+' : ''}${stats.balance} RUB

CATEGORY BREAKDOWN:
${Object.entries(stats.categoryBreakdown)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amount]) => `- ${cat}: ${amount} RUB`)
  .join('\n')}

TOP EXPENSES:
${stats.topExpenses.map((exp, i) => `${i + 1}. ${exp.description} - ${exp.amount} RUB (${exp.category})`).join('\n')}

${budgetAlerts && budgetAlerts.length > 0 ? `
BUDGET ALERTS:
${budgetAlerts.map(alert => `⚠️ ${alert.category}: ${alert.spent}/${alert.limit} RUB (${alert.percentUsed.toFixed(0)}%)`).join('\n')}
` : ''}

YOUR TASK:
1. Summarize the week in a friendly, conversational tone
2. Highlight positive trends (e.g., saved money, stayed under budget)
3. If there are budget alerts, mention them gently
4. Give 1-2 actionable insights or tips (be specific and constructive)
5. Keep it concise (5-7 sentences max)
6. Respond in ${user.language}

TONE: Friendly, supportive, non-judgemental, encouraging
  `.trim();
}
