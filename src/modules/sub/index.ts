import { registerModuleHandler } from '../router';
import { handleSubMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('sub', handleSubMessage);
logger.info('✓ Sub module registered');

export * from './types';
export * from './handlers';
