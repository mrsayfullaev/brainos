/**
 * Knowledge Base Module (V3) - Entry point
 */

import { registerModuleHandler } from '../router';
import { handleKbMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('kb', handleKbMessage);

logger.info('✓ KB (Knowledge Base) module registered');

export * from './types';
export * from './parser';
export * from './embeddings';
export * from './queries';
export * from './handlers';
