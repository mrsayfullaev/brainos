import { registerModuleHandler } from '../router';
import { handleBuyMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('buy', handleBuyMessage);
logger.info('✓ Buy module registered');

export * from './types';
export * from './handlers';
