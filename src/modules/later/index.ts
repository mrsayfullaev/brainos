/**
 * Read Later Module (V3) - Entry point
 */

import { registerModuleHandler } from '../router';
import { handleLaterMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('later', handleLaterMessage);
logger.info('✓ Read Later module registered');

export * from './types';
export { extractMetadata, type URLMetadata } from './metadata';
export * from './queries';
export * from './handlers';
