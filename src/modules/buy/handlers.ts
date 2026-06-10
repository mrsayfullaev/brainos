import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createBuyItem, getBuyItems } from './queries';

export async function handleBuyMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const name = message.replace(/купить|buy|shopping/gi, '').trim() || 'Item';
  
  await createBuyItem({ userId: user.id, name });
  
  const items = await getBuyItems(user.id);
  
  return {
    modulePrompt: `Added to shopping list. Total items: ${items.length}. Confirm in ${user.language}.`,
  };
}
