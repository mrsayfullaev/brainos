import { registerModuleHandler } from '../router';
import { handleHealthMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('health', handleHealthMessage);
logger.info('✓ Health module registered');

export * from './types';
export * from './handlers';
