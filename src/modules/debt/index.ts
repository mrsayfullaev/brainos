import { registerModuleHandler } from '../router';
import { handleDebtMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('debt', handleDebtMessage);
logger.info('✓ Debt module registered');

export * from './types';
export * from './handlers';
