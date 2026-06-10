import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createIdea, getIdeas } from './queries';

export async function handleIdeaMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const tags = (message.match(/#\w+/g) || []).map(t => t.slice(1));
  const content = message.replace(/идея|idea|#\w+/gi, '').trim();
  
  await createIdea({ userId: user.id, content, tags });
  const total = (await getIdeas(user.id, 1000)).length;
  
  return {
    modulePrompt: `Idea saved (total: ${total}). Confirm in ${user.language}.`,
  };
}
