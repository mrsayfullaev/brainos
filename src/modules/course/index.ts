/**
 * Courses Module (V3) - Entry point
 */

import { registerModuleHandler } from '../router';
import { handleCourseMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('course', handleCourseMessage);
logger.info('✓ Courses module registered');

export * from './types';
export * from './queries';
export * from './handlers';
