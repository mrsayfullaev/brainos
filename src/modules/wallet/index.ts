/**
 * Wallet Module - Entry Point
 * Финансовый модуль для отслеживания доходов и расходов
 */

import { registerModuleHandler } from '../router';
import {
  handleWalletMessage,
  // handleShowExpenses,
  // handleSetBudget,
} from './handlers';
import { logger } from '../../utils/logger';

// Регистрируем обработчик модуля
registerModuleHandler('wallet', handleWalletMessage);

logger.info('✓ Wallet module registered');

// Экспорты
export * from './types';
export * from './parser';
export * from './queries';
export * from './handlers';
export * from './prompts';
export * from './analytics';
export * from './cron';
