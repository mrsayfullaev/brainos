/**
 * Tasks Module - Entry Point
 */

import { registerModuleHandler } from '../router';
import { handleTaskMessage } from './handlers';
import { logger } from '../../utils/logger';

// Регистрируем обработчик модуля
registerModuleHandler('task', handleTaskMessage);

logger.info('✓ Task module registered');

// Экспорты
export * from './types';
export * from './parser';
export * from './queries';
export * from './handlers';
export * from './prompts';
