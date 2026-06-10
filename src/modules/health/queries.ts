import { prisma } from '../../database/client';
import type { HealthEntry } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { HealthInput } from './types';

export async function createHealthEntry(data: HealthInput) {
  const encrypted = encrypt(data.description);
  if (!encrypted) throw new Error('Encryption failed');
  
  return prisma.healthEntry.create({
    data: {
      userId: data.userId,
      type: data.type,
      description: encrypted,
      metadata: data.metadata || {},
    },
  });
}

export async function getHealthEntries(userId: string, limit = 20) {
  const entries = await prisma.healthEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  });
  
  return entries.map((e: HealthEntry) => ({ ...e, description: decrypt(e.description) || '' }));
}
