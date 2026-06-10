import { registerModuleHandler } from '../router';
import { handleTripMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('trip', handleTripMessage);
logger.info('✓ Trip module registered');

export * from './types';
export * from './handlers';
