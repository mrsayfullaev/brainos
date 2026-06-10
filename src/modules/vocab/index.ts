import { registerModuleHandler } from '../router';
import { handleVocabMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('vocab', handleVocabMessage);
logger.info('✓ Vocab module registered');

export * from './types';
export * from './handlers';
