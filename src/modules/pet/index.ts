/**
 * Pets Module (V3) - Entry point
 */

import { registerModuleHandler } from '../router';
import { handlePetMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('pet', handlePetMessage);
logger.info('✓ Pets module registered');

export * from './queries';
export * from './handlers';
