import { registerModuleHandler } from '../router';
import { handleQuoteMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('quote', handleQuoteMessage);
logger.info('✓ Quote module registered');

export * from './types';
export * from './handlers';
