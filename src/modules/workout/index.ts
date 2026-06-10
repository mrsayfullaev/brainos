import { registerModuleHandler } from '../router';
import { handleWorkoutMessage } from './handlers';
import { logger } from '../../utils/logger';

registerModuleHandler('workout', handleWorkoutMessage);
logger.info('✓ Workout module registered');

export * from './types';
export * from './handlers';
