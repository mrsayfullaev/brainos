import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { parseSleep } from './parser';
import { createSleep, getSleepRecords } from './queries';
import { logger } from '../../utils/logger';

export async function handleSleepMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  try {
    const parsed = await parseSleep(message, user.language);
    
    const wakeup = parsed.wakeup || new Date();
    
    const sleep = await createSleep({
      userId: user.id,
      bedtime: parsed.bedtime,
      wakeup,
      quality: parsed.quality,
      notes: parsed.notes,
    });
    
    const recent = await getSleepRecords(user.id, 7);
    const avgDuration = recent.reduce((sum: number, s) => sum + s.duration, 0) / recent.length;
    const avgQuality = recent.filter(s => s.quality).reduce((sum: number, s) => sum + (s.quality || 0), 0) / recent.filter(s => s.quality).length;
    
    const modulePrompt = `
=== SLEEP MODULE ===
Sleep recorded: ${sleep.duration} min${sleep.quality ? `, quality: ${sleep.quality}/10` : ''}

7-day average: ${Math.round(avgDuration)} min${avgQuality ? `, quality: ${avgQuality.toFixed(1)}/10` : ''}

Confirm briefly in ${user.language}.
    `.trim();
    
    logger.info('Sleep recorded');
    return { modulePrompt, data: sleep };
  } catch (error) {
    logger.error('Error in sleep handler:', error);
    return { modulePrompt: `Error. Respond in ${user.language}.` };
  }
}
