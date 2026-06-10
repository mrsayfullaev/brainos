/**
 * Reminders Module - Entry Point
 */

import { registerModuleHandler } from '../router';
import { handleReminderMessage } from './handlers';
import { logger } from '../../utils/logger';

// Регистрируем обработчик модуля
registerModuleHandler('remind', handleReminderMessage);

logger.info('✓ Remind module registered');

// Экспорты
export * from './types';
export * from './parser';
export * from './queries';
export * from './handlers';
export * from './prompts';
export * from './cron';
