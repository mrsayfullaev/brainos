/**
 * Investments Module (V3) - Entry point
 */

import { registerModuleHandler } from '../router';
import { handleInvestMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('invest', handleInvestMessage);
logger.info('✓ Investments module registered');

export * from './types';
export * from './api';
export * from './queries';
export * from './handlers';
