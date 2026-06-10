import { prisma } from '../../database/client';
import type { BuyItem } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { BuyItemInput } from './types';

export async function createBuyItem(data: BuyItemInput) {
  return prisma.buyItem.create({
    data: {
      userId: data.userId,
      name: encrypt(data.name) || '',
      quantity: data.quantity || 1,
      priority: data.priority || 3,
      purchased: data.purchased || false,
    },
  });
}

export async function getBuyItems(userId: string) {
  const items = await prisma.buyItem.findMany({
    where: { userId, purchased: false },
    orderBy: { priority: 'asc' },
  });
  
  return items.map((i: BuyItem) => ({ ...i, name: decrypt(i.name) || '' }));
}
