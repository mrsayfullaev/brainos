/**
 * Projects Module (V3) - Entry point
 */

import { registerModuleHandler } from '../router';
import { handleProjectMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('project', handleProjectMessage);
logger.info('✓ Projects module registered');

export * from './types';
export * from './queries';
export * from './handlers';
