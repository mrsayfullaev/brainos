/**
 * Генерация системных сообщений (приветствия, справка).
 * GigaChat → OpenAI fallback.
 * Во все промпты передаётся контекст пользователя: язык, имя, настройки, customPrompt.
 */

import { systemLLMGenerate } from './system-llm';
import { logger } from '../utils/logger';

/** Контекст пользователя для любого промпта в LLM (язык, имя, настройки, кастомный промпт) */
export interface UserContextForLLM {
  language: string;
  name?: string | null;
  customPrompt?: string | null;
  tone?: string | null;
  length?: string | null;
  emoji?: string | null;
  structure?: string | null;
  style?: string | null;
  detail?: string | null;
}

/** Собрать контекст для LLM из объекта пользователя (ctx.user и т.п.) */
export function toUserContext(user: {
  language: string;
  name?: string | null;
  customPrompt?: string | null;
  tone?: string | null;
  length?: string | null;
  emoji?: string | null;
  structure?: string | null;
  style?: string | null;
  detail?: string | null;
}): UserContextForLLM {
  return {
    language: user.language,
    name: user.name ?? null,
    customPrompt: user.customPrompt ?? null,
    tone: user.tone ?? null,
    length: user.length ?? null,
    emoji: user.emoji ?? null,
    structure: user.structure ?? null,
    style: user.style ?? null,
    detail: user.detail ?? null,
  };
}

const LANG_NAMES: Record<string, string> = {
  'ru': 'Russian', 'en': 'English', 'es': 'Spanish', 'uz': 'Uzbek', 'ar': 'Arabic', 'tr': 'Turkish'
};

/** Формирует блок "User context" для вставки в промпт */
function formatUserContext(u: UserContextForLLM): string {
  const langName = LANG_NAMES[u.language] || 'Russian';
  const parts: string[] = [
    `Language: ${langName}`,
    u.name ? `User name: ${u.name}` : '',
    u.customPrompt ? `User's custom instruction (follow it when relevant): "${u.customPrompt}"` : '',
    [u.tone, u.length, u.emoji, u.structure, u.style, u.detail].some(Boolean)
      ? `User preferences: tone=${u.tone || 'neutral'}, length=${u.length || 'medium'}, emoji=${u.emoji || 'moderate'}, structure=${u.structure || 'mixed'}, style=${u.style || 'friend'}, detail=${u.detail || 'with_context'}`
      : ''
  ];
  return parts.filter(Boolean).join('\n');
}

/**
 * Генерирует приветственное сообщение для нового пользователя
 */
export async function generateWelcomeMessage(userContext: UserContextForLLM): Promise<string> {
  const langName = LANG_NAMES[userContext.language] || 'Russian';
  const userBlock = formatUserContext(userContext);

  const prompt = `Write a SHORT welcome message (2-3 sentences max) for a new user.

${userBlock}

Requirements: Be warm and friendly. Explain you use multiple AI models to give best answers. Keep it short and simple.
Write ONLY the welcome message, nothing else.`;

  try {
    return await systemLLMGenerate(prompt, { language: langName });
  } catch (error) {
    logger.error('Failed to generate welcome message:', error);
    return 'Привет! Я — мультимодельный AI-ассистент. Использую несколько AI одновременно, чтобы дать тебе лучший ответ!';
  }
}

