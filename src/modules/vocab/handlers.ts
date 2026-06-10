import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createVocabEntry, getVocab } from './queries';

export async function handleVocabMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const parts = message.split(/[-—=]/);
  const word = parts[0]?.replace(/слово|vocab/gi, '').trim() || '';
  const translation = parts[1]?.trim() || '';
  
  if (!word || !translation) {
    return {
      modulePrompt: `Format: "word - translation". Respond in ${user.language}.`,
    };
  }
  
  await createVocabEntry({
    userId: user.id,
    word,
    translation,
    language: user.language,
  });
  
  const total = (await getVocab(user.id, 1000)).length;
  
  return {
    modulePrompt: `Word saved (total: ${total}). Confirm in ${user.language}.`,
  };
}
