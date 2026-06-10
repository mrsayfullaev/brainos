/**
 * Note Module - Entry Point
 */

import { registerModuleHandler } from '../router';
import { handleNoteMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('note', handleNoteMessage);

logger.info('✓ Note module registered');

export * from './types';
export * from './parser';
export * from './queries';
export * from './handlers';
