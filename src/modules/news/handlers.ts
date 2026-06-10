import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createNewsItem, getNewsItems } from './queries';

export async function handleNewsMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const urlMatch = message.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : undefined;
  
  const title = message.replace(/новост|news|https?:\/\/[^\s]+/gi, '').trim() || 'Article';
  
  await createNewsItem({ userId: user.id, title, url });
  
  const total = (await getNewsItems(user.id, 1000)).length;
  
  return {
    modulePrompt: `Article saved (total: ${total}). Confirm in ${user.language}.`,
  };
}
