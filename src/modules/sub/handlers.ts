import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createSubscription, getSubscriptions } from './queries';

export async function handleSubMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const costMatch = message.match(/(\d+)/);
  const cost = costMatch ? parseInt(costMatch[1]) : 0;
  
  const period: any = /год|year/i.test(message) ? 'YEARLY' : 'MONTHLY';
  
  const name = message.replace(/подписк|sub|subscription|\d+|руб|месяц|год|year|month/gi, '').trim() || 'Subscription';
  
  const nextPayment = new Date();
  nextPayment.setMonth(nextPayment.getMonth() + (period === 'YEARLY' ? 12 : 1));
  
  await createSubscription({ userId: user.id, name, cost, period, nextPayment });
  
  const subs = await getSubscriptions(user.id);
  const totalMonthly = subs.reduce((sum: number, s: any) => 
    sum + (s.period === 'MONTHLY' ? s.cost : s.cost / 12), 0);
  
  return {
    modulePrompt: `Subscription added. Total monthly: ${totalMonthly.toFixed(0)}. Confirm in ${user.language}.`,
  };
}
