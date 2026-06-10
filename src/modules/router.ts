/**
 * Роутер модулей V2
 * Анализирует намерения пользователя и направляет в соответствующий модуль
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import { systemLLMGenerate } from '../ai/system-llm';
import { raceAIProviders } from '../ai/race';
import { logger } from '../utils/logger';
import { createAIResponse } from '../database/queries/response';
import type { 
  IntentAnalysis, 
  ModuleHandler, 
  ModuleHandlerRegistry,
  ModuleName 
} from './types';
import { canAccessModule, checkAIRequestLimit, getAccessibleModules } from './premium';

// Реестр обработчиков модулей (будет заполняться по мере создания модулей)
const MODULE_HANDLERS: ModuleHandlerRegistry = {
  // Модули будут регистрироваться здесь
  // Пример: wallet: handleWalletMessage,
};

/**
 * Анализирует намерение пользователя (GigaChat → OpenAI fallback)
 */
async function analyzeIntent(
  userMessage: string,
  userLanguage: string
): Promise<IntentAnalysis> {
  try {
    const prompt = `Analyze this user message and determine:
1. Which module is needed (if any): task, remind, note, wallet, sub, savings, debt, health, workout, sleep, water, food, vocab, book, contact, news, idea, trip, place, buy, quote, kb, habit, invest, course, email, later, project, car, pet
2. Action: create, read, update, delete, list, analyze
3. Confidence: 0-100

Message: "${userMessage}"

Respond ONLY in JSON format (no markdown, no extra text):
{
  "module": "wallet",
  "action": "create",
  "confidence": 95
}

If no module is needed, respond:
{
  "module": null,
  "action": "none",
  "confidence": 0
}`;

    logger.debug(`Analyzing intent for message: "${userMessage.substring(0, 50)}..."`);
    
    const response = await systemLLMGenerate(prompt, { language: userLanguage });
    
    // Убираем markdown обёртки если есть
    const cleanResponse = response
      .replace(/```json\n/g, '')
      .replace(/```\n/g, '')
      .replace(/```/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanResponse) as IntentAnalysis;
    
    logger.debug(`Intent analysis result: module=${parsed.module}, action=${parsed.action}, confidence=${parsed.confidence}`);
    
    return parsed;
  } catch (error) {
    logger.error('Failed to analyze intent:', error);
    
    // Fallback: нет модуля
    return {
      module: null,
      action: 'none',
      confidence: 0,
    };
  }
}

// buildSystemPrompt вынесен в systemPrompt.ts для использования в V3 модулях
import { buildSystemPrompt } from './systemPrompt';

/**
 * Основной роутер модулей
 * Определяет нужен ли модуль и направляет обработку
 */
export async function routeToModule(
  ctx: Context,
  user: User,
  message: string
): Promise<void> {
  try {
    // V4: лимит AI-запросов для Free
    const withinLimit = await checkAIRequestLimit(user.id);
    if (!withinLimit) {
      await ctx.reply(
        'Лимит AI-запросов на этом месяце исчерпан. Обновите тариф в /settings или дождитесь следующего месяца.'
      );
      return;
    }

    // 1. Анализируем намерение (GigaChat → OpenAI)
    const intent = await analyzeIntent(message, user.language);

    // 2. Если уверенность низкая или модуль не определён, используем стандартный V1 flow
    if (!intent.module || intent.confidence < 70) {
      logger.debug('No module needed or low confidence, using standard AI response');
      return await handleStandardMessage(ctx, user, message);
    }

    // V4: проверка доступа к модулю по тарифу
    const hasAccess = await canAccessModule(user, intent.module);
    if (!hasAccess) {
      logger.debug(`User ${user.id} has no access to module ${intent.module}, using standard AI response`);
      return await handleStandardMessage(ctx, user, message);
    }

    // 3. Проверяем, есть ли обработчик для модуля
    const handler = MODULE_HANDLERS[intent.module as ModuleName];
    if (!handler) {
      logger.warn(`No handler found for module: ${intent.module}, falling back to standard response`);
      return await handleStandardMessage(ctx, user, message);
    }

    // 4. Выполняем обработчик модуля
    logger.info(`Routing to module: ${intent.module} (confidence: ${intent.confidence}%)`);
    const moduleResult = await handler(ctx, user, message);

    // 5. Если модуль вернул прямой ответ, отправляем его
    if (moduleResult.skipAI && moduleResult.directResponse) {
      await ctx.reply(moduleResult.directResponse);
      return;
    }

    // 6. Строим расширенный промпт: базовый (V1) + контекст модуля (V2)
    const accessibleModules = await getAccessibleModules(user);
    const basePrompt = buildSystemPrompt(user, accessibleModules);
    const enhancedPrompt = `${basePrompt}\n\n${moduleResult.modulePrompt}`;

    // 7. Запускаем race AI провайдеров (V1 система)
    logger.debug('Racing AI providers with enhanced prompt');
    const aiResponse = await raceAIProviders(enhancedPrompt, message, user.language);

    // 8. Отправляем ответ пользователю
    await ctx.reply(
      `${aiResponse.winner.response}\n\n— ${aiResponse.winner.model}`,
      { parse_mode: 'Markdown' }
    );

    // 9. Логируем в БД (V1 + V2)
    await createAIResponse({
      userId: user.id,
      userMessage: message,
      winnerModel: aiResponse.winner.model,
      winnerResponse: aiResponse.winner.response,
      winnerTime: aiResponse.winner.time,
      allResponses: aiResponse.all,
      moduleUsed: intent.module, // NEW V2: отслеживаем использованный модуль
    });

    logger.info('Module response completed successfully');
  } catch (error) {
    logger.error('Error in module router:', error);
    await ctx.reply('Произошла ошибка при обработке сообщения. Попробуйте ещё раз.');
  }
}

/**
 * Стандартная обработка сообщения (V1 flow без модулей)
 */
async function handleStandardMessage(
  ctx: Context,
  user: User,
  message: string
): Promise<void> {
  try {
    // Модули по тарифу — AI отвечает только о доступных пользователю
    const accessibleModules = await getAccessibleModules(user);
    const systemPrompt = buildSystemPrompt(user, accessibleModules);

    // Запускаем race AI провайдеров
    const aiResponse = await raceAIProviders(systemPrompt, message, user.language);

    // Отправляем ответ
    await ctx.reply(
      `${aiResponse.winner.response}\n\n— ${aiResponse.winner.model}`,
      { parse_mode: 'Markdown' }
    );

    // Логируем в БД
    await createAIResponse({
      userId: user.id,
      userMessage: message,
      winnerModel: aiResponse.winner.model,
      winnerResponse: aiResponse.winner.response,
      winnerTime: aiResponse.winner.time,
      allResponses: aiResponse.all,
      moduleUsed: null, // Модуль не использовался
    });
  } catch (error) {
    logger.error('Error in standard message handler:', error);
    await ctx.reply('Произошла ошибка при обработке сообщения. Попробуйте ещё раз.');
  }
}

/**
 * Регистрирует обработчик модуля
 * Используется при создании новых модулей
 */
export function registerModuleHandler(
  moduleName: ModuleName,
  handler: ModuleHandler
): void {
  MODULE_HANDLERS[moduleName] = handler;
  logger.info(`Module handler registered: ${moduleName}`);
}
