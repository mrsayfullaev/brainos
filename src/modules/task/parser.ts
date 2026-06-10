/**
 * Tasks Module - NLP Parser
 * Парсинг пользовательских сообщений о задачах (GigaChat → OpenAI)
 */

import { systemLLMGenerate } from '../../ai/system-llm';
import { logger } from '../../utils/logger';
import type { ParsedTask, TaskPriority } from './types';

/**
 * Парсит сообщение о задаче
 * 
 * Примеры:
 * - "задача купить молоко завтра"
 * - "задача !!! позвонить клиенту #work"
 * - "задача через 3 дня сдать отчёт"
 * - "task buy milk tomorrow"
 */
export async function parseTask(
  input: string,
  userLanguage: string
): Promise<ParsedTask> {
  try {
    const prompt = `Parse this task message and extract structured data.

Message: "${input}"
Language: ${userLanguage}

Extract:
1. title: main task description (required)
2. priority: based on markers:
   - "!!!" or "срочно" or "urgent" = URGENT
   - "!!" or "важно" or "important" = HIGH
   - "!" = MEDIUM
   - no marker = LOW
3. dueDate: parse natural language dates:
   - "завтра"/"tomorrow" = tomorrow
   - "через N дней"/"in N days" = +N days
   - "в понедельник"/"on Monday" = next Monday
   - specific dates
4. tags: hashtags like #work, #personal
5. description: additional details if any

Respond ONLY with valid JSON (no markdown):
{
  "title": "купить молоко",
  "priority": "LOW",
  "dueDate": "2024-02-09",
  "tags": ["shopping"]
}`;

    logger.debug(`Parsing task: "${input.substring(0, 50)}..."`);
    
    const response = await systemLLMGenerate(prompt, { language: userLanguage });
    
    // Убираем markdown
    const cleanResponse = response
      .replace(/```json\n/g, '')
      .replace(/```\n/g, '')
      .replace(/```/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanResponse);
    
    // Конвертируем дату
    if (parsed.dueDate) {
      parsed.dueDate = new Date(parsed.dueDate);
    }
    
    logger.debug(`Parsed task: ${JSON.stringify(parsed)}`);
    
    return parsed as ParsedTask;
  } catch (error) {
    logger.error('Failed to parse task:', error);
    
    // Fallback parser
    return fallbackParse(input);
  }
}

/**
 * Fallback парсер если LLM недоступен или вернул некорректный JSON
 */
function fallbackParse(input: string): ParsedTask {
  logger.warn('Using fallback parser for task');
  
  // Определяем приоритет по маркерам
  let priority: TaskPriority = 'LOW';
  if (input.includes('!!!') || /срочн|urgent/i.test(input)) {
    priority = 'URGENT';
  } else if (input.includes('!!') || /важн|important/i.test(input)) {
    priority = 'HIGH';
  } else if (input.includes('!')) {
    priority = 'MEDIUM';
  }
  
  // Извлекаем теги
  const tags = (input.match(/#\w+/g) || []).map(tag => tag.slice(1));
  
  // Определяем дату
  let dueDate: Date | undefined;
  if (/завтра|tomorrow/i.test(input)) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
  } else if (/через\s+(\d+)\s+дн|in\s+(\d+)\s+day/i.test(input)) {
    const match = input.match(/через\s+(\d+)\s+дн|in\s+(\d+)\s+day/i);
    const days = parseInt(match?.[1] || match?.[2] || '0');
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
  }
  
  // Извлекаем заголовок (текст без маркеров и тегов)
  const title = input
    .replace(/задача|task|!!!|!!|!|#\w+/gi, '')
    .replace(/завтра|tomorrow|через\s+\d+\s+дн|in\s+\d+\s+day/gi, '')
    .trim();
  
  return {
    title: title || 'Новая задача',
    priority,
    dueDate,
    tags: tags.length > 0 ? tags : undefined,
  };
}

/**
 * Парсит команду для изменения статуса задачи
 * 
 * Примеры:
 * - "выполнил задачу купить молоко"
 * - "готово #3"
 * - "в процессе задача отчёт"
 */
export async function parseTaskStatusChange(
  input: string,
  _userLanguage: string
): Promise<{ query: string; status: string }> {
  const lowerInput = input.toLowerCase();
  
  let status = 'TODO';
  
  if (/готово|выполн|done|complet/i.test(lowerInput)) {
    status = 'DONE';
  } else if (/в\s+процесс|начал|in\s+progress|working/i.test(lowerInput)) {
    status = 'IN_PROGRESS';
  } else if (/отмен|cancel/i.test(lowerInput)) {
    status = 'CANCELLED';
  }
  
  // Извлекаем поисковый запрос (текст после команды)
  const query = input
    .replace(/готово|выполн|done|complet|в\s+процесс|начал|in\s+progress|working|отмен|cancel|задача|task/gi, '')
    .trim();
  
  return { query, status };
}
