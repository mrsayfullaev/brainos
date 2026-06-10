import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createSavingsGoal, getSavingsGoals } from './queries';

export async function handleSavingsMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const amountMatch = message.match(/(\d+)/);
  const targetAmount = amountMatch ? parseInt(amountMatch[1]) : 0;
  
  const name = message.replace(/накоп|saving|\d+|руб/gi, '').trim() || 'Savings Goal';
  
  await createSavingsGoal({ userId: user.id, name, targetAmount });
  
  const goals = await getSavingsGoals(user.id);
  
  return {
    modulePrompt: `Savings goal created. Active goals: ${goals.length}. Confirm in ${user.language}.`,
  };
}
