import { registerModuleHandler } from '../router';
import { handleContactMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('contact', handleContactMessage);
logger.info('✓ Contact module registered');

export * from './types';
export * from './handlers';
