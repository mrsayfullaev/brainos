import { registerModuleHandler } from '../router';
import { handleSavingsMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('savings', handleSavingsMessage);
logger.info('✓ Savings module registered');

export * from './types';
export * from './handlers';
