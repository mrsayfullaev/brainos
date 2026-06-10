/**
 * Habits Module (V3) - Entry point
 */

import { registerModuleHandler } from '../router';
import { handleHabitMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('habit', handleHabitMessage);
logger.info('✓ Habits module registered');

export * from './types';
export * from './queries';
export * from './handlers';
