import { prisma } from '../../database/client';
import type { Idea } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { IdeaInput } from './types';

export async function createIdea(data: IdeaInput) {
  const encrypted = encrypt(data.content);
  if (!encrypted) throw new Error('Encryption failed');
  
  const idea = await prisma.idea.create({
    data: {
      userId: data.userId,
      content: encrypted,
      category: data.category,
      tags: data.tags || [],
    },
  });
  
  return { ...idea, content: decrypt(idea.content) || data.content };
}

export async function getIdeas(userId: string, limit = 20) {
  const ideas = await prisma.idea.findMany({
    where: { userId, archived: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  
    return ideas.map((i: Idea) => ({ ...i, content: decrypt(i.content) || '' }));
}
