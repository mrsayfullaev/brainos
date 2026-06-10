import { prisma } from '../../database/client';
import type { Sleep } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import type { SleepInput } from './types';

export async function createSleep(data: SleepInput) {
  try {
    const duration = Math.round((data.wakeup.getTime() - data.bedtime.getTime()) / (1000 * 60));
    
    const sleep = await prisma.sleep.create({
      data: {
        userId: data.userId,
        bedtime: data.bedtime,
        wakeup: data.wakeup,
        duration,
        quality: data.quality,
        notes: data.notes ? encrypt(data.notes) : null,
      },
    });
    
    return {
      ...sleep,
      notes: sleep.notes ? decrypt(sleep.notes) : null,
    };
  } catch (error) {
    logger.error('Error creating sleep:', error);
    throw error;
  }
}

export async function getSleepRecords(userId: string, limit: number = 7) {
  const records = await prisma.sleep.findMany({
    where: { userId },
    orderBy: { bedtime: 'desc' },
    take: limit,
  });
  
    return records.map((r: Sleep) => ({
      ...r,
      notes: r.notes ? decrypt(r.notes) : null,
    }));
}
