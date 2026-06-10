/**
 * Car Module (V3) - Entry point
 */

import { registerModuleHandler } from '../router';
import { handleCarMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('car', handleCarMessage);
logger.info('✓ Car module registered');

export * from './types';
export * from './queries';
export * from './handlers';
