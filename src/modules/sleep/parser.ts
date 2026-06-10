/**
 * Sleep Module - Simple parser
 */

import { logger } from '../../utils/logger';
import type { ParsedSleep } from './types';

export async function parseSleep(input: string, _lang: string): Promise<ParsedSleep> {
  try {
    // Парсим время сна/пробуждения
    const timeMatches = input.match(/(\d{1,2}):(\d{2})/g);
    
    const now = new Date();
    const bedtime = now;
    let wakeup: Date | undefined;
    
    if (timeMatches && timeMatches.length >= 1) {
      const [hours, minutes] = timeMatches[0].split(':').map(Number);
      bedtime.setHours(hours, minutes, 0, 0);
      
      if (timeMatches.length >= 2) {
        wakeup = new Date(bedtime);
        const [wHours, wMinutes] = timeMatches[1].split(':').map(Number);
        wakeup.setHours(wHours, wMinutes, 0, 0);
        if (wakeup < bedtime) wakeup.setDate(wakeup.getDate() + 1);
      }
    }
    
    // Качество сна (1-10)
    const qualityMatch = input.match(/(\d{1,2})\s*\/\s*10|качество\s*[:-]?\s*(\d{1,2})/i);
    const quality = qualityMatch ? parseInt(qualityMatch[1] || qualityMatch[2]) : undefined;
    
    return {
      bedtime,
      wakeup,
      quality,
    };
  } catch (error) {
    logger.error('Failed to parse sleep:', error);
    return { bedtime: new Date() };
  }
}
