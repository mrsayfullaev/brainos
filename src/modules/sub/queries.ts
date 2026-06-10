import { prisma } from '../../database/client';
import type { Subscription } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { SubscriptionInput } from './types';

export async function createSubscription(data: SubscriptionInput) {
  return prisma.subscription.create({
    data: {
      userId: data.userId,
      name: encrypt(data.name) || '',
      cost: data.cost,
      period: data.period,
      nextPayment: data.nextPayment,
      active: true,
    },
  });
}

export async function getSubscriptions(userId: string) {
  const subs = await prisma.subscription.findMany({
    where: { userId, active: true },
    orderBy: { nextPayment: 'asc' },
  });
  
  return subs.map((s: Subscription) => ({ ...s, name: decrypt(s.name) || '' }));
}
