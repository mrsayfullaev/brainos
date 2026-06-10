/**
 * Read Later Module - Queries (V3)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { ContentType } from './types';

export async function createReadLater(params: {
  userId: string;
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  type?: ContentType;
}) {
  const encryptedUrl = encrypt(params.url);
  if (!encryptedUrl) throw new Error('Encryption failed');

  return prisma.readLater.create({
    data: {
      userId: params.userId,
      url: encryptedUrl,
      title: params.title ? encrypt(params.title) : null,
      description: params.description ? encrypt(params.description) : null,
      imageUrl: params.imageUrl ? encrypt(params.imageUrl) : null,
      tags: params.tags || [],
      type: params.type || 'ARTICLE',
    },
  });
}

export async function getReadLaterList(
  userId: string,
  filters?: { read?: boolean; archived?: boolean; limit?: number }
) {
  const items = await prisma.readLater.findMany({
    where: {
      userId,
      ...(filters?.read !== undefined ? { read: filters.read } : {}),
      ...(filters?.archived !== undefined ? { archived: filters.archived } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 50,
  });

  return items.map((i) => ({
    ...i,
    url: decrypt(i.url) || '',
    title: i.title ? decrypt(i.title) : null,
    description: i.description ? decrypt(i.description) : null,
    imageUrl: i.imageUrl ? decrypt(i.imageUrl) : null,
  }));
}

export async function markAsRead(id: string, userId: string) {
  await prisma.readLater.updateMany({
    where: { id, userId },
    data: { read: true, readAt: new Date() },
  });
}

export async function archiveItem(id: string, userId: string) {
  await prisma.readLater.updateMany({
    where: { id, userId },
    data: { archived: true },
  });
}
