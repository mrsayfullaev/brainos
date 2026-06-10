/**
 * Wallet Module - NLP Parser
 * Парсинг пользовательских сообщений о транзакциях (GigaChat → OpenAI)
 */

import { systemLLMGenerate } from '../../ai/system-llm';
import { logger } from '../../utils/logger';
import type { ParsedTransaction, ExpenseCategory } from './types';

/**
 * Парсит сообщение о транзакции
 * 
 * Примеры входных данных:
 * - "кошелёк кофе 290"
 * - "кошелёк зарплата +80000"
 * - "кошелёк такси 450 #transport"
 * - "потратил 1500 на продукты"
 * - "+5000 фриланс"
 */
export async function parseTransaction(
  input: string,
  userLanguage: string
): Promise<ParsedTransaction> {
  try {
    const prompt = `Parse this financial transaction message and extract structured data.

Message: "${input}"
Language: ${userLanguage}

Extract:
1. type: "INCOME" (if starts with +, or words like зарплата/salary/income) or "EXPENSE" (default)
2. amount: number (required, extract first number found)
3. description: short text description of what it's for
4. category: ONE of these: food, transport, entertainment, health, shopping, utilities, education, other
5. currency: RUB (default), USD, EUR, etc.

Category detection hints:
- food: кофе, обед, продукты, ресторан, coffee, lunch, groceries, restaurant
- transport: такси, метро, бензин, taxi, metro, gas, uber
- entertainment: кино, театр, игры, cinema, theater, games
- health: аптека, врач, лекарства, pharmacy, doctor, medicine
- shopping: одежда, обувь, clothes, shoes
- utilities: свет, вода, интернет, electricity, water, internet
- education: книга, курс, book, course
- other: if unclear

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "type": "EXPENSE",
  "amount": 290,
  "description": "кофе",
  "category": "food",
  "currency": "RUB"
}`;

    logger.debug(`Parsing transaction: "${input.substring(0, 50)}..."`);
    
    const response = await systemLLMGenerate(prompt, { language: userLanguage });
    
    // Убираем markdown обёртки если есть
    const cleanResponse = response
      .replace(/```json\n/g, '')
      .replace(/```\n/g, '')
      .replace(/```/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanResponse) as ParsedTransaction;
    
    // Валидация
    if (!parsed.amount || parsed.amount <= 0) {
      throw new Error('Invalid amount');
    }
    
    if (!['INCOME', 'EXPENSE'].includes(parsed.type)) {
      parsed.type = 'EXPENSE'; // Default
    }
    
    logger.debug(`Parsed transaction: ${JSON.stringify(parsed)}`);
    
    return parsed;
  } catch (error) {
    logger.error('Failed to parse transaction:', error);
    
    // Fallback: простой парсинг по регулярным выражениям
    return fallbackParse(input);
  }
}

/**
 * Fallback парсер если LLM недоступен или вернул некорректный JSON
 */
function fallbackParse(input: string): ParsedTransaction {
  logger.warn('Using fallback parser for transaction');
  
  // Ищем число (сумму)
  const amountMatch = input.match(/(\d+(?:[.,]\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
  
  // Определяем тип (доход или расход)
  const isIncome = input.includes('+') || 
                   /зарплат|salary|income|доход|получил/i.test(input);
  
  // Извлекаем описание (текст без чисел и служебных слов)
  let description = input
    .replace(/кошелёк|wallet|потратил|spent|\d+|[+#]/g, '')
    .trim();
  
  if (description.length > 100) {
    description = description.substring(0, 100);
  }
  
  return {
    type: isIncome ? 'INCOME' : 'EXPENSE',
    amount,
    description: description || undefined,
    category: 'other',
    currency: 'RUB',
  };
}

/**
 * Определяет категорию расхода по описанию (если LLM не вернул категорию)
 */
export function detectCategory(description: string): ExpenseCategory {
  const lowerDesc = description.toLowerCase();
  
  // Еда
  if (/кофе|обед|завтрак|ужин|продукт|еда|рестор|кафе|coffee|lunch|breakfast|dinner|food|restaurant|cafe|groceries/i.test(lowerDesc)) {
    return 'food';
  }
  
  // Транспорт
  if (/такси|метро|автобус|бензин|парков|uber|taxi|metro|bus|gas|parking|transport/i.test(lowerDesc)) {
    return 'transport';
  }
  
  // Развлечения
  if (/кино|театр|концерт|игр|развлечен|cinema|theater|concert|game|entertainment/i.test(lowerDesc)) {
    return 'entertainment';
  }
  
  // Здоровье
  if (/аптек|врач|лекарств|больниц|здоров|pharmacy|doctor|medicine|hospital|health/i.test(lowerDesc)) {
    return 'health';
  }
  
  // Покупки
  if (/одежд|обув|магазин|покупк|clothes|shoes|shop|shopping/i.test(lowerDesc)) {
    return 'shopping';
  }
  
  // Коммунальные услуги
  if (/свет|вода|газ|интернет|телефон|коммунальн|electricity|water|internet|phone|utilities/i.test(lowerDesc)) {
    return 'utilities';
  }
  
  // Образование
  if (/книг|курс|учеб|образов|book|course|education|learning/i.test(lowerDesc)) {
    return 'education';
  }
  
  return 'other';
}
