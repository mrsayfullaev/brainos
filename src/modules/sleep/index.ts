import { registerModuleHandler } from '../router';
import { handleSleepMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('sleep', handleSleepMessage);
logger.info('✓ Sleep module registered');

export * from './types';
export * from './handlers';
