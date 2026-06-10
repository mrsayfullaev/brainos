/**
 * Email Module (V3) - Entry point
 */

import { registerModuleHandler } from '../router';
import { handleEmailMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('email', handleEmailMessage);
logger.info('✓ Email module registered');

export * from './types';
export * from './generator';
export * from './queries';
export * from './handlers';
