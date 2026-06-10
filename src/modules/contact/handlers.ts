import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createContact, getContacts } from './queries';

export async function handleContactMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const phoneMatch = message.match(/\+?\d[\d\s()-]{7,}/);
  const phone = phoneMatch ? phoneMatch[0] : undefined;
  
  const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : undefined;
  
  const name = message
    .replace(/контакт|contact|\+?\d[\d\s()-]{7,}|[\w.-]+@[\w.-]+\.\w+/gi, '')
    .trim() || 'Unknown';
  
  await createContact({ userId: user.id, name, phone, email });
  
  const total = (await getContacts(user.id)).length;
  
  return {
    modulePrompt: `Contact saved (total: ${total}). Confirm in ${user.language}.`,
  };
}
