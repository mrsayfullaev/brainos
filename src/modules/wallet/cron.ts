/**
 * Wallet Module - Cron Jobs
 * Scheduled tasks для отправки дайджестов и напоминаний
 */

import { prisma } from '../../database/client';
import { logger } from '../../utils/logger';
import { sendTelegramMessage } from '../../bot/sendMessage';
// import { generateWeeklyDigest, forecastMonthlyExpenses } from './analytics';
// import { checkBudgetUsage, getBudgets } from './queries';

/**
 * Отправляет еженедельные дайджесты всем пользователям
 * Запускается по воскресеньям в 20:00
 */
export async function sendWeeklyDigests() {
  try {
    logger.info('Starting weekly digests job...');
    
    // Получаем всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        language: true,
      },
    });
    
    logger.info(`Found ${users.length} users for weekly digest`);
    
    let sentCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        // TODO: когда будет generateWeeklyDigest — подставить сообщение
        const message = `Еженедельный дайджест.\n\nЗдесь будет сводка по кошельку (после реализации generateWeeklyDigest).`;
        await sendTelegramMessage(user.telegramId, message);
        logger.info(`Weekly digest sent to user ${user.id}`);
        sentCount++;
      } catch (error) {
        logger.error(`Failed to send weekly digest to user ${user.id}:`, error);
        errorCount++;
      }
    }
    
    logger.info(`Weekly digests job completed: ${sentCount} sent, ${errorCount} errors`);
  } catch (error) {
    logger.error('Error in weekly digests job:', error);
  }
}

/**
 * Проверяет бюджеты и отправляет предупреждения
 * Запускается ежедневно в 18:00
 */
export async function checkBudgetAlerts() {
  try {
    logger.info('Starting budget alerts job...');
    
    // TODO: Uncomment when getBudgets and checkBudgetUsage are ready
    /*
    const users = await prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        language: true,
      },
    });
    
    let alertsSent = 0;
    
    for (const user of users) {
      try {
        const budgets = await getBudgets(user.id);
        
        for (const budget of budgets) {
          const usage = await checkBudgetUsage(user.id, budget.category, budget.period);
          
          if (!usage) continue;
          
          if (usage.percentUsed > 90) {
            // TODO: Send alert
            logger.info(`Budget alert for user ${user.id} category ${budget.category || 'other'}`);
            alertsSent++;
          }
        }
      } catch (error) {
        logger.error(`Failed to check budgets for user ${user.id}:`, error);
      }
    }
    
    logger.info(`Budget alerts job completed: ${alertsSent} alerts sent`);
    */
    
    logger.info('Budget alerts job skipped (not implemented yet)');
  } catch (error) {
    logger.error('Error in budget alerts job:', error);
  }
}

/**
 * Отправляет прогноз расходов на конец месяца
 * Запускается 25-го числа каждого месяца в 10:00
 */
export async function sendMonthlyForecast() {
  try {
    logger.info('Starting monthly forecast job...');
    
    // Проверяем дату (только 25-е число)
    const today = new Date().getDate();
    if (today !== 25) {
      logger.info('Not the 25th, skipping monthly forecast');
      return;
    }
    
    // Получаем всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        language: true,
      },
    });
    
    let sentCount = 0;
    
    for (const user of users) {
      try {
        // TODO: когда будет forecastMonthlyExpenses — подставить сообщение
        const message = `Прогноз расходов на конец месяца.\n\nЗдесь будет прогноз (после реализации forecastMonthlyExpenses).`;
        await sendTelegramMessage(user.telegramId, message);
        logger.info(`Monthly forecast sent to user ${user.id}`);
        sentCount++;
      } catch (error) {
        logger.error(`Failed to send monthly forecast to user ${user.id}:`, error);
      }
    }
    
    logger.info(`Monthly forecast job completed: ${sentCount} sent`);
  } catch (error) {
    logger.error('Error in monthly forecast job:', error);
  }
}

// ==================== HELPER FUNCTIONS ====================
// TODO: Uncomment when Telegram sending is implemented

/*
/**
 * Форматирует сообщение с еженедельным дайджестом
 */
/*
function formatWeeklyDigestMessage(digest: any): string {
  return `
Итоги недели

Доходы: ${digest.stats.income} ₽
Расходы: ${digest.stats.expenses} ₽
Баланс: ${digest.stats.balance > 0 ? '+' : ''}${digest.stats.balance} ₽

По категориям:
${Object.entries(digest.stats.categoryBreakdown)
  .sort(([, a]: any, [, b]: any) => b - a)
  .slice(0, 5)
  .map(([cat, amount]) => `• ${cat}: ${amount} ₽`)
  .join('\n')}

${digest.insights}

${digest.budgetAlerts && digest.budgetAlerts.length > 0 
  ? `\nПредупреждения о бюджете:\n${digest.budgetAlerts.map((a: any) => 
      `• ${a.category}: ${a.spent}/${a.limit} ₽ (${a.percentUsed.toFixed(0)}%)`
    ).join('\n')}` 
  : ''}
  `.trim();
}
*/

/*
/**
 * Форматирует предупреждение о бюджете
 */
/*
function formatBudgetAlert(
  _language: string,
  category: string,
  spent: number,
  limit: number,
  remaining: number,
  percentUsed: number
): string {
  // TODO: implement proper localization
  return `
Предупреждение о бюджете

Категория: ${category}
Потрачено: ${spent} ₽ из ${limit} ₽
Использовано: ${percentUsed.toFixed(0)}%
Осталось: ${remaining} ₽

${remaining > 0 
  ? `У вас осталось ${remaining} ₽ в этой категории.` 
  : 'Вы превысили лимит бюджета!'}
  `.trim();
}
*/

/*
/**
 * Форматирует прогноз расходов на конец месяца
 */
/*
function formatMonthlyForecast(_language: string, forecast: any): string {
  return `
Прогноз на конец месяца

Прошло дней: ${forecast.daysElapsed}
Осталось дней: ${forecast.daysRemaining}

Потрачено: ${forecast.currentSpent.toFixed(0)} ₽
Средний дневной расход: ${forecast.dailyAverage.toFixed(0)} ₽

Прогноз на конец месяца:
• Расходы: ${forecast.projectedTotal.toFixed(0)} ₽
• Баланс: ${forecast.projectedBalance > 0 ? '+' : ''}${forecast.projectedBalance.toFixed(0)} ₽

${forecast.projectedBalance < 0 
  ? 'Внимание: прогнозируется отрицательный баланс!' 
  : 'Прогноз положительный!'}
  `.trim();
}
*/
