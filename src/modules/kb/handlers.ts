/**
 * Knowledge Base - Handlers (V3)
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import { raceAIProviders } from '../../ai/race';
import { buildSystemPrompt } from '../systemPrompt';
import type { ModuleResult } from '../types';
import { parseKnowledgeInput } from './parser';
import {
  createKnowledgePage,
  getKnowledgePages,
  semanticSearch,
  getKnowledgeGraph,
} from './queries';
import { logger } from '../../utils/logger';

/**
 * Обработчик сообщений модуля Knowledge Base
 */
export async function handleKbMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const trimmed = message.replace(/^@kb\s*/i, '').trim();

  try {
    // Поиск: "найди про X", "поиск Nginx", "найди в базе"
    if (/найди|поиск|search|find/i.test(trimmed) && trimmed.length > 5) {
      const query = trimmed.replace(/найди|поиск|search|find|в базе|в базе знаний/gi, '').trim();
      const results = await semanticSearch(user.id, query, 5);
      const list =
        results.length > 0
          ? results.map((p, i) => `${i + 1}. ${p.title}`).join('\n')
          : 'Ничего не найдено.';
      const modulePrompt = `
=== KNOWLEDGE BASE SEARCH ===
User searched: "${query}"
Results (${results.length}):\n${list}

Summarize briefly in ${user.language}. If empty, suggest adding notes or documents.
      `.trim();
      return { modulePrompt, data: { results } };
    }

    // Вопрос по базе: "что такое OAuth?", "как настроить Nginx?"
    if (/^что такое|как (настроить|работает|сделать)|что значит/i.test(trimmed) || trimmed.endsWith('?')) {
      const question = trimmed.replace(/\?+$/, '').trim();
      const relevantPages = await semanticSearch(user.id, question, 3);
      if (relevantPages.length === 0) {
        return {
          modulePrompt: `In the user's knowledge base nothing was found for: "${question}". Reply in ${user.language} that there is no relevant info and suggest adding a note or document.`,
        };
      }
      const context = relevantPages.map((p) => `[${p.title}]:\n${p.content.slice(0, 1500)}`).join('\n\n---\n\n');
      const basePrompt = buildSystemPrompt(user);
      const fullPrompt = `
${basePrompt}

KNOWLEDGE BASE CONTEXT (answer using ONLY this):
${context}

Question: ${question}

Rules: Answer based only on the context above. If the answer is not in the context, say so. Cite the source page. Language: ${user.language}.
      `.trim();
      const response = await raceAIProviders(fullPrompt, question);
      return {
        modulePrompt: response.winner.response,
        skipAI: true,
        directResponse: response.winner.response,
      };
    }

    // Граф связей
    if (/граф|graph|связи|links/i.test(trimmed) && trimmed.length < 20) {
      const graph = await getKnowledgeGraph(user.id);
      const modulePrompt = `
=== KNOWLEDGE BASE GRAPH ===
Nodes: ${graph.nodes.length}
Edges (wikilinks): ${graph.edges.length}

Describe briefly in ${user.language}. Example: "У тебя N страниц и M связей между ними."
      `.trim();
      return { modulePrompt, data: graph };
    }

    // Создание страницы: первая строка — заголовок, остальное — контент
    const parsed = parseKnowledgeInput(trimmed);
    const page = await createKnowledgePage({
      userId: user.id,
      title: parsed.title,
      content: parsed.content,
      tags: parsed.tags,
      generateEmbeddingForSearch: true,
    });

    const total = (await getKnowledgePages(user.id, 1000)).length;
    const modulePrompt = `
=== KNOWLEDGE BASE - NEW PAGE ===
Created page: "${page.title}"
Total pages: ${total}

Confirm briefly in ${user.language}. Mention that they can search with "найди про ..." or ask "что такое ...".
    `.trim();

    logger.info('KB module: page created');
    return { modulePrompt, data: page };
  } catch (error) {
    logger.error('Error in KB module handler:', error);
    return {
      modulePrompt: `Error in knowledge base. Reply in ${user.language}.`,
    };
  }
}
