import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createQuote, getQuotes } from './queries';

export async function handleQuoteMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  // Парсим автора (если есть)
  const authorMatch = message.match(/—\s*([^,\n]+)/);
  const author = authorMatch ? authorMatch[1].trim() : undefined;
  
  const text = message
    .replace(/цитата|quote|—\s*[^,\n]+/gi, '')
    .trim();
  
  await createQuote({ userId: user.id, text, author });
  const total = (await getQuotes(user.id, 1000)).length;
  
  return {
    modulePrompt: `Quote saved (total: ${total}). Confirm in ${user.language}.`,
  };
}
