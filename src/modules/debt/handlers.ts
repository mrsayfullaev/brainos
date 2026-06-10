import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createDebt, getDebts } from './queries';

export async function handleDebtMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const amountMatch = message.match(/(\d+)/);
  const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
  
  const creditor = message.replace(/долг|debt|\d+|руб/gi, '').trim() || 'Unknown';
  
  await createDebt({ userId: user.id, creditor, amount });
  
  const debts = await getDebts(user.id);
  const total = debts.reduce((sum: number, d: any) => sum + d.amount, 0);
  
  return {
    modulePrompt: `Debt recorded. Total debt: ${total}. Confirm in ${user.language}.`,
  };
}
