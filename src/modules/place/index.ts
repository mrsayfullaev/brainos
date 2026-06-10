import { registerModuleHandler } from '../router';
import { handlePlaceMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('place', handlePlaceMessage);
logger.info('✓ Place module registered');

export * from './types';
export * from './handlers';
