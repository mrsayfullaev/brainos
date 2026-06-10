import { registerModuleHandler } from '../router';
import { handleWaterMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('water', handleWaterMessage);
logger.info('✓ Water module registered');

export * from './types';
export * from './handlers';
