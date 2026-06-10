import { registerModuleHandler } from '../router';
import { handleNewsMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('news', handleNewsMessage);
logger.info('✓ News module registered');

export * from './types';
export * from './handlers';
