import { prisma } from '../../database/client';
import type { Book } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { BookInput } from './types';

export async function createBook(data: BookInput) {
  return prisma.book.create({
    data: {
      userId: data.userId,
      title: encrypt(data.title) || '',
      author: data.author ? encrypt(data.author) : null,
      status: data.status,
      pages: data.pages,
      currentPage: data.currentPage || 0,
    },
  });
}

export async function getBooks(userId: string, status?: 'TO_READ' | 'READING' | 'COMPLETED') {
  const books = await prisma.book.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { updatedAt: 'desc' },
  });
  
  return books.map((b: Book) => ({
    ...b,
    title: decrypt(b.title) || '',
    author: b.author ? decrypt(b.author) : null,
  }));
}
