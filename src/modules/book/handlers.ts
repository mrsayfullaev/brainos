import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createBook, getBooks } from './queries';

export async function handleBookMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  let status: any = 'TO_READ';
  if (/читаю|reading/i.test(message)) status = 'READING';
  else if (/прочитал|completed|finished/i.test(message)) status = 'COMPLETED';
  
  const parts = message.split(/—|автор/i);
  const title = parts[0]?.replace(/книга|book/gi, '').trim() || 'Untitled';
  const author = parts[1]?.trim();
  
  await createBook({ userId: user.id, title, author, status });
  
  const reading = await getBooks(user.id, 'READING');
  
  return {
    modulePrompt: `Book added (${status}). ${reading.length > 0 ? `Currently reading: ${reading.length}` : ''}. Confirm in ${user.language}.`,
  };
}
