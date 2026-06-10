import { registerModuleHandler } from '../router';
import { handleFoodMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('food', handleFoodMessage);
logger.info('✓ Food module registered');

export * from './types';
export * from './handlers';
