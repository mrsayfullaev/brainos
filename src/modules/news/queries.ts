import { prisma } from '../../database/client';
import type { NewsItem } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { NewsItemInput } from './types';

export async function createNewsItem(data: NewsItemInput) {
  return prisma.newsItem.create({
    data: {
      userId: data.userId,
      title: encrypt(data.title) || '',
      url: data.url,
      source: data.source,
      tags: data.tags || [],
      read: false,
    },
  });
}

export async function getNewsItems(userId: string, limit = 20) {
  const items = await prisma.newsItem.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
    take: limit,
  });
  
  return items.map((n: NewsItem) => ({ ...n, title: decrypt(n.title) || '' }));
}
