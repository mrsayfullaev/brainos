import { prisma } from '../../database/client';
import type { VocabEntry } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { VocabInput } from './types';

export async function createVocabEntry(data: VocabInput) {
  return prisma.vocabEntry.create({
    data: {
      userId: data.userId,
      word: encrypt(data.word) || '',
      translation: encrypt(data.translation) || '',
      language: data.language,
      context: data.context ? encrypt(data.context) : null,
      reviewCount: 0,
      lastReviewed: null,
    },
  });
}

export async function getVocab(userId: string, limit = 20) {
  const entries = await prisma.vocabEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  
  return entries.map((e: VocabEntry) => ({
    ...e,
    word: decrypt(e.word) || '',
    translation: decrypt(e.translation) || '',
    context: e.context ? decrypt(e.context) : null,
  }));
}
