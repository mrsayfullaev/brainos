/**
 * Note Module - Parser
 */

import { logger } from '../../utils/logger';
import type { ParsedNote } from './types';

export async function parseNote(
  input: string,
  _userLanguage: string
): Promise<ParsedNote> {
  try {
    // Извлекаем теги
    const tags = (input.match(/#\w+/g) || []).map(tag => tag.slice(1));
    
    // Удаляем префиксы и теги из контента
    const content = input
      .replace(/заметка|note|#\w+/gi, '')
      .trim();
    
    return {
      content,
      tags: tags.length > 0 ? tags : undefined,
    };
  } catch (error) {
    logger.error('Failed to parse note:', error);
    
    return {
      content: input,
    };
  }
}
