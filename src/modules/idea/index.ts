import { registerModuleHandler } from '../router';
import { handleIdeaMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('idea', handleIdeaMessage);
logger.info('✓ Idea module registered');

export * from './types';
export * from './handlers';
