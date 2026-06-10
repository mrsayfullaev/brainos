import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { addWater, getTodayWater, getWaterGoal } from './queries';

export async function handleWaterMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const amountMatch = message.match(/(\d+)/);
  const amount = amountMatch ? parseInt(amountMatch[1]) : 250;
  
  await addWater({ userId: user.id, amount });
  
  const today = await getTodayWater(user.id);
  const goal = await getWaterGoal(user.id);
  
  return {
    modulePrompt: `
=== WATER MODULE ===
Added: ${amount} ml
Today: ${today} ml / ${goal} ml (${Math.round((today / goal) * 100)}%)

Confirm briefly in ${user.language}.
    `.trim(),
  };
}
