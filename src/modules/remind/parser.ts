/**
 * Reminders Module - NLP Parser
 * Парсинг напоминаний с natural language (GigaChat → OpenAI)
 */

import { systemLLMGenerate } from '../../ai/system-llm';
import { logger } from '../../utils/logger';
import type { ParsedReminder, RecurrenceType } from './types';
import { parseUtcOffset, localToUtcDate, getCurrentLocalHHMM } from '../../utils/timezone';

/**
 * Парсит сообщение о напоминании
 *
 * Примеры:
 * - "напомни через 2 часа позвонить маме"
 * - "каждый понедельник в 9:00 делать зарядку"
 * - "каждый год 3 сентября поздравить Макса"
 * - "remind me tomorrow at 10am to buy milk"
 *
 * @param userTimezone — часовой пояс пользователя (UTC+3 и т.д.); время в фразах интерпретируется в его поясе
 */
export async function parseReminder(
  input: string,
  userLanguage: string,
  userTimezone?: string | null
): Promise<ParsedReminder> {
  const offsetMinutes = parseUtcOffset(userTimezone);
  const tzHint = userTimezone ? `User timezone: ${userTimezone}. ` : '';

  // Явная дата «сегодня» для LLM — избегаем путаницы 06.03 vs 03.06
  const now = new Date();
  const todayLocal = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  const year = todayLocal.getUTCFullYear();
  const month = todayLocal.getUTCMonth() + 1;
  const day = todayLocal.getUTCDate();
  const todayExplicit = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  try {
    const prompt = `Parse this reminder message and extract structured data.

Message: "${input}"
Language: ${userLanguage}
${tzHint}Interpret times like "10:00" or "tomorrow at 10am" in the user's local time and return triggerAt in ISO 8601 UTC (e.g. 2024-02-09T07:00:00.000Z).
IMPORTANT: Today's date is ${todayExplicit} (YYYY-MM-DD). "сегодня"/"today" means THIS EXACT DATE.
Current UTC: ${now.toISOString()}

Extract:
1. text: what to remind about (required)
2. triggerAt: when to trigger (ISO date string)
   - "сегодня"/"today" = TODAY ${todayExplicit} at the specified time
   - "через 2 часа"/"in 2 hours" = +2 hours from now
   - "завтра"/"tomorrow" = the day after today
   - "завтра в 10:00"/"tomorrow at 10am" = tomorrow at 10:00
   - "3 сентября"/"september 3" = this/next year Sept 3
3. recurrence: type of repeat
   - "каждый день"/"every day" = DAILY
   - "каждую неделю"/"every week" или "каждый понедельник" = WEEKLY
   - "каждый месяц" = MONTHLY
   - "каждый год" = YEARLY
   - no repeat = ONCE
4. recurrenceRule: if WEEKLY, specify day (MON, TUE, etc)

Respond ONLY with valid JSON:
{
  "text": "позвонить маме",
  "triggerAt": "2024-02-09T14:00:00Z",
  "recurrence": "ONCE"
}`;

    logger.debug(`Parsing reminder: "${input.substring(0, 50)}..."`);
    
    const response = await systemLLMGenerate(prompt, { language: userLanguage });
    
    const cleanResponse = response
      .replace(/```json\n/g, '')
      .replace(/```\n/g, '')
      .replace(/```/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanResponse);
    
    // Конвертируем дату
    if (parsed.triggerAt) {
      parsed.triggerAt = new Date(parsed.triggerAt);
    }
    
    logger.debug(`Parsed reminder: ${JSON.stringify(parsed)}`);
    
    return parsed as ParsedReminder;
  } catch (error) {
    logger.error('Failed to parse reminder:', error);
    return fallbackParse(input, offsetMinutes);
  }
}

/**
 * Fallback парсер (дата/время в поясе пользователя через offsetMinutes)
 */
function fallbackParse(input: string, offsetMinutes: number): ParsedReminder {
  logger.warn('Using fallback parser for reminder');

  const now = new Date();
  let triggerAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour default
  let recurrence: RecurrenceType = 'ONCE';
  let recurrenceRule: string | undefined;

  // "сегодня в HH:MM" / "today at HH:MM" — сегодня в указанное локальное время пользователя
  if (/сегодня|today/i.test(input)) {
    const timeMatch = input.match(/(\d{1,2}):(\d{2})/);
    const shifted = new Date(now.getTime() + offsetMinutes * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const m = shifted.getUTCMonth();
    const dt = shifted.getUTCDate();
    let hours: number;
    let minutes: number;
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    } else {
      const [h, mm] = getCurrentLocalHHMM(offsetMinutes).split(':').map(Number);
      hours = h ?? 12;
      minutes = mm ?? 0;
    }
    triggerAt = localToUtcDate(y, m, dt, hours, minutes, offsetMinutes);
    if (triggerAt <= now) {
      triggerAt = new Date(now.getTime() + 60 * 1000);
    }
  } else if (/через\s+(\d+)\s+час|in\s+(\d+)\s+hour/i.test(input)) {
    const match = input.match(/через\s+(\d+)\s+час|in\s+(\d+)\s+hour/i);
    const hours = parseInt(match?.[1] || match?.[2] || '1');
    triggerAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
  } else if (/через\s+(\d+)\s+мин|in\s+(\d+)\s+min/i.test(input)) {
    const match = input.match(/через\s+(\d+)\s+мин|in\s+(\d+)\s+min/i);
    const minutes = parseInt(match?.[1] || match?.[2] || '30');
    triggerAt = new Date(now.getTime() + minutes * 60 * 1000);
  } else if (/завтра|tomorrow/i.test(input)) {
    const userVirtualNow = now.getTime() + offsetMinutes * 60 * 1000;
    const userDayStart = Math.floor(userVirtualNow / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000) - offsetMinutes * 60 * 1000;
    const tomorrowStartUTC = userDayStart + 24 * 60 * 60 * 1000;
    const userLocalTimestamp = tomorrowStartUTC + offsetMinutes * 60 * 1000;
    const d = new Date(userLocalTimestamp);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const date = d.getUTCDate();
    const timeMatch = input.match(/(\d{1,2}):(\d{2})/);
    let hours: number;
    let minutes: number;
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    } else {
      const [h, m] = getCurrentLocalHHMM(offsetMinutes).split(':').map(Number);
      hours = h ?? 12;
      minutes = m ?? 0;
    }
    triggerAt = localToUtcDate(year, month, date, hours, minutes, offsetMinutes);
  }
  
  // Парсим повторения
  if (/каждый\s+день|every\s+day|daily/i.test(input)) {
    recurrence = 'DAILY';
  } else if (/каждую\s+неделю|every\s+week|weekly/i.test(input)) {
    recurrence = 'WEEKLY';
  } else if (/каждый\s+понедельник|every\s+monday/i.test(input)) {
    recurrence = 'WEEKLY';
    recurrenceRule = 'MON';
  } else if (/каждый\s+месяц|every\s+month|monthly/i.test(input)) {
    recurrence = 'MONTHLY';
  } else if (/каждый\s+год|every\s+year|yearly/i.test(input)) {
    recurrence = 'YEARLY';
  }
  
  // Извлекаем текст напоминания
  const text = input
    .replace(/напомни|remind|через|in|завтра|tomorrow|каждый|every|день|day|неделю|week|месяц|month|год|year|\d+|час|hour|мин|min|понедельник|monday/gi, '')
    .trim();
  
  return {
    text: text || 'Напоминание',
    triggerAt,
    recurrence,
    ...(recurrenceRule ? { recurrenceRule } : {}),
  };
}

/**
 * Вычисляет следующий trigger для повторяющегося напоминания
 */
export function calculateNextTrigger(
  currentTrigger: Date,
  recurrence: RecurrenceType,
  _recurrenceRule?: string
): Date {
  const next = new Date(currentTrigger);
  
  switch (recurrence) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      // ONCE - не повторяется
      return currentTrigger;
  }
  
  return next;
}
