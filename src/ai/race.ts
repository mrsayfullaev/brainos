import { callOpenAI } from './providers/openai';
// import { callGemini } from './providers/gemini'; // Отключен - не работает с AI Studio API
import { callGigaChat } from './providers/gigachat';
// import { callClaude } from './providers/claude'; // Claude временно отключен
import { logger } from '../utils/logger';

export interface AIResponse {
  model: string;
  response: string;
  time: number;
}

export interface RaceResult {
  winner: AIResponse;
  all: AIResponse[];
}

type AIProvider = {
  name: string;
  fn: (systemPrompt: string, userMessage: string) => Promise<string>;
};

/**
 * Запускает гонку между всеми AI провайдерами
 * Возвращает первый полученный ответ как победителя
 * Собирает все ответы для аналитики
 */
export async function raceAIProviders(
  systemPrompt: string,
  userMessage: string,
  _language?: string // V2: optional language parameter (not used yet, but added for consistency)
): Promise<RaceResult> {
  // Активные провайдеры
  const providers: AIProvider[] = [
    { name: 'gpt-4', fn: callOpenAI },
    // { name: 'gemini-pro', fn: callGemini }, // Отключен - не работает с AI Studio API
    { name: 'gigachat', fn: callGigaChat },
    // Claude временно отключен (раскомментируйте если есть ключ)
    // { name: 'claude-sonnet', fn: callClaude },
  ];

  logger.info(`Starting AI race with ${providers.length} providers...`);
  const startTime = Date.now();

  // Создаем промисы для всех провайдеров с таймаутом
  const promises = providers.map(async (provider) => {
    const providerStart = Date.now();
    
    try {
      // Таймаут на 15 секунд
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 15000);
      });

      const responsePromise = provider.fn(systemPrompt, userMessage);
      const response = await Promise.race([responsePromise, timeoutPromise]);

      const aiResponse: AIResponse = {
        model: provider.name,
        response,
        time: Date.now() - providerStart,
      };

      logger.info(`${provider.name} responded in ${aiResponse.time}ms`);
      return aiResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`${provider.name} failed: ${errorMessage}`);
      return null;
    }
  });

  // Гонка: возвращаем первый успешный результат
  // Используем Promise.race с фильтрацией null значений
  let winner: AIResponse | null = null;
  
  try {
    // Создаём race только из успешных результатов
    const successfulPromises = promises.map(async (p) => {
      const result = await p;
      if (result) {
        return result;
      }
      // Возвращаем промис, который никогда не разрешится (для игнорирования ошибок)
      return new Promise<AIResponse>(() => {});
    });
    
    winner = await Promise.race(successfulPromises);
  } catch (error) {
    // Если все провайдеры упали синхронно
    logger.error('All AI providers failed in the race');
  }
  
  // Если winner всё ещё null, значит все провайдеры упали
  if (!winner) {
    // Ждём все промисы до конца, возможно кто-то всё же ответит
    const allResults = await Promise.all(promises);
    const successfulResults = allResults.filter((r): r is AIResponse => r !== null);
    
    if (successfulResults.length > 0) {
      // Берём первый успешный результат
      winner = successfulResults[0];
      logger.info(`Winner (from delayed responses): ${winner.model} (${winner.time}ms)`);
    } else {
      throw new Error('No AI provider responded successfully');
    }
  } else {
    logger.info(`Winner: ${winner.model} (${winner.time}ms)`);
  }

  // Ждём завершения всех остальных провайдеров для аналитики
  const allResults = (await Promise.allSettled(promises))
    .filter((r): r is PromiseFulfilledResult<AIResponse> => 
      r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value);

  const totalTime = Date.now() - startTime;
  logger.info(`AI race completed in ${totalTime}ms. Received ${allResults.length}/4 responses.`);

  return {
    winner,
    all: allResults,
  };
}

/**
 * Создает системный промпт на основе предпочтений пользователя
 */
export function buildSystemPrompt(user: {
  language: string;
  tone?: string | null;
  length?: string | null;
  emoji?: string | null;
  structure?: string | null;
  style?: string | null;
  detail?: string | null;
  customPrompt?: string | null;
}): string {
  const preferences = {
    tone: user.tone || 'neutral',
    length: user.length || 'medium',
    emoji: user.emoji || 'moderate',
    structure: user.structure || 'mixed',
    style: user.style || 'friend',
    detail: user.detail || 'with_context',
  };

  const preferencesMap: Record<string, Record<string, string>> = {
    tone: {
      formal: 'Use formal language (вы/you). Be professional.',
      friendly: 'Use informal language (ты/thou). Be casual and warm.',
      neutral: 'Use balanced, neutral tone.',
    },
    length: {
      brief: 'Keep responses very concise - 2-3 sentences max.',
      medium: 'Provide optimal length responses - not too short, not too long.',
      detailed: 'Give comprehensive, detailed answers with examples.',
    },
    emoji: {
      yes: 'Use emojis frequently to make responses engaging.',
      no: 'Do not use emojis. Text only.',
      moderate: 'Use emojis sparingly (1-2 per response).',
    },
    structure: {
      lists: 'Structure responses with bullet points and numbered lists.',
      paragraphs: 'Write in connected paragraphs.',
      mixed: 'Use both paragraphs and lists as appropriate.',
    },
    style: {
      expert: 'Explain like an expert - technical, professional.',
      friend: 'Explain like a friend - simple language, analogies.',
      teacher: 'Explain like a teacher - step-by-step with examples.',
    },
    detail: {
      answer_only: 'Provide only the direct answer without extra context.',
      with_context: 'Provide answer with brief context/explanation.',
      maximum: 'Provide maximum detail: history, nuances, alternatives.',
    },
  };

  let prompt = `You are a helpful AI assistant. Respond in ${user.language}.\n\n`;

  prompt += `USER PREFERENCES:\n`;
  for (const [key, value] of Object.entries(preferences)) {
    const instruction = preferencesMap[key]?.[value];
    if (instruction) {
      prompt += `- ${instruction}\n`;
    }
  }

  if (user.customPrompt) {
    prompt += `\nUSER CUSTOM INSTRUCTIONS:\n${user.customPrompt}\n`;
  }

  prompt += `\nIMPORTANT: Always respond in ${user.language}, regardless of the input language.`;

  return prompt;
}
