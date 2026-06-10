/**
 * Системный LLM: GigaChat с fallback на OpenAI GPT.
 * Используется для приветствий, /help, парсинга (кошелёк, задачи, напоминания, роутер).
 * Кэш ответов (Redis) и circuit breaker при массовых сбоях GigaChat.
 */

import { createHash } from 'crypto';
import { callGigaChat } from './providers/gigachat';
import { callOpenAI } from './providers/openai';
import { logger } from '../utils/logger';
import { cacheGet, cacheSet } from '../utils/redis';

export interface SystemLLMOptions {
  systemPrompt?: string;
  language?: string;
}

const DEFAULT_SYSTEM = 'You are a helpful assistant. Respond concisely.';

/** TTL кэша ответов (1 час) */
const CACHE_TTL_SEC = 3600;

/** Circuit breaker: после 3 ошибок подряд — пропускать GigaChat 60 сек */
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 60_000;

let gigaChatFailures = 0;
let gigaChatLastFailureAt = 0;

function cacheKey(systemPrompt: string, prompt: string, language?: string): string {
  const payload = `${systemPrompt}|${prompt}|${language ?? ''}`;
  return 'system-llm:' + createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

/**
 * Генерация текста через GigaChat; при ошибке — fallback на OpenAI.
 * Кэш в Redis (если доступен); circuit breaker при массовых сбоях GigaChat.
 */
export async function systemLLMGenerate(
  prompt: string,
  options?: SystemLLMOptions
): Promise<string> {
  const systemPrompt = options?.systemPrompt ?? DEFAULT_SYSTEM;
  const langHint = options?.language
    ? ` Respond in ${options.language} or the language requested in the prompt.`
    : '';

  const fullSystem = systemPrompt + langHint;
  const key = cacheKey(fullSystem, prompt, options?.language);

  // 1. Проверка кэша
  const cached = await cacheGet(key);
  if (cached) return cached;

  // 2. Circuit breaker: если GigaChat недавно падал 3+ раз — сразу OpenAI
  const now = Date.now();
  const circuitOpen =
    gigaChatFailures >= CIRCUIT_BREAKER_THRESHOLD &&
    now - gigaChatLastFailureAt < CIRCUIT_BREAKER_COOLDOWN_MS;

  if (circuitOpen) {
    logger.warn('GigaChat circuit breaker open, using OpenAI');
    const response = await callOpenAI(fullSystem, prompt);
    await cacheSet(key, response, CACHE_TTL_SEC);
    return response;
  }

  // 3. Пробуем GigaChat
  try {
    const response = await callGigaChat(fullSystem, prompt);
    gigaChatFailures = 0;
    await cacheSet(key, response, CACHE_TTL_SEC);
    return response;
  } catch (error) {
    gigaChatFailures++;
    gigaChatLastFailureAt = Date.now();
    logger.warn('GigaChat failed, fallback to OpenAI:', (error as Error).message);
    const response = await callOpenAI(fullSystem, prompt);
    await cacheSet(key, response, CACHE_TTL_SEC);
    return response;
  }
}
