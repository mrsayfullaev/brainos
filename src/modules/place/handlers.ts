import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createPlace, getPlaces } from './queries';

export async function handlePlaceMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const name = message.replace(/место|place/gi, '').trim() || 'Place';
  
  await createPlace({ userId: user.id, name });
  
  const total = (await getPlaces(user.id)).length;
  
  return {
    modulePrompt: `Place saved (total: ${total}). Confirm in ${user.language}.`,
  };
}
