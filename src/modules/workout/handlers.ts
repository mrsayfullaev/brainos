import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createWorkout } from './queries';

export async function handleWorkoutMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const exercises = [{ name: message.replace(/спорт|workout/gi, '').trim() }];
  
  await createWorkout({
    userId: user.id,
    type: 'general',
    exercises,
  });
  
  return {
    modulePrompt: `Workout logged. Confirm in ${user.language}.`,
  };
}
