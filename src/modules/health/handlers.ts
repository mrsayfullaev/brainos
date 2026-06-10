import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createHealthEntry } from './queries';

export async function handleHealthMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  let type: any = 'SYMPTOM';
  if (/лекарств|medication|таблет/i.test(message)) type = 'MEDICATION';
  else if (/анализ|lab|test/i.test(message)) type = 'LAB_TEST';
  else if (/врач|doctor/i.test(message)) type = 'DOCTOR_VISIT';
  
  const description = message.replace(/здоровье|health/gi, '').trim();
  
  await createHealthEntry({ userId: user.id, type, description });
  
  return {
    modulePrompt: `Health entry saved (${type}). Respond in ${user.language}. Remind: not medical advice.`,
  };
}
