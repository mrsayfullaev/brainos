import { registerModuleHandler } from '../router';
import { handleBookMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('book', handleBookMessage);
logger.info('✓ Book module registered');

export * from './types';
export * from './handlers';
