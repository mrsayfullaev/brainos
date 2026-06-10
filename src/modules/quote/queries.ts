import { prisma } from '../../database/client';
import type { Quote } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { QuoteInput } from './types';

export async function createQuote(data: QuoteInput) {
  const encrypted = encrypt(data.text);
  if (!encrypted) throw new Error('Encryption failed');
  
  const quote = await prisma.quote.create({
    data: {
      userId: data.userId,
      text: encrypted,
      author: data.author ? encrypt(data.author) : null,
      source: data.source ? encrypt(data.source) : null,
      tags: data.tags || [],
    },
  });
  
  return { 
    ...quote, 
    text: decrypt(quote.text) || data.text,
    author: quote.author ? decrypt(quote.author) : null,
    source: quote.source ? decrypt(quote.source) : null,
  };
}

export async function getQuotes(userId: string, limit = 20) {
  const quotes = await prisma.quote.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  
  return quotes.map((q: Quote) => ({ 
    ...q, 
    text: decrypt(q.text) || '',
    author: q.author ? decrypt(q.author) : null,
    source: q.source ? decrypt(q.source) : null,
  }));
}
