/**
 * Tasks Module - Handlers
 * Бизнес-логика обработки задач
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { parseTask, parseTaskStatusChange } from './parser';
import { 
  createTask, 
  getTasks,
  getTaskStats,
  updateTask,
  searchTasks
} from './queries';
import { buildTaskPrompt } from './prompts';
import { logger } from '../../utils/logger';

/**
 * Обработчик создания новой задачи
 */
export async function handleTaskMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  try {
    logger.info(`Task module: processing message for user ${user.id}`);
    
    // Проверяем, это создание задачи или изменение статуса
    if (/готово|done|выполн|в\s+процесс|отмен/i.test(message)) {
      return await handleTaskStatusChange(user, message);
    }
    
    // 1. Парсим задачу
    const parsed = await parseTask(message, user.language);
    
    // 2. Создаём задачу
    const task = await createTask({
      userId: user.id,
      ...parsed,
    });
    
    // 3. Получаем контекст
    const recentTasks = await getTasks(user.id, { status: 'TODO', limit: 5 });
    const stats = await getTaskStats(user.id);
    
    // 4. Строим промпт для AI
    const modulePrompt = buildTaskPrompt({
      user,
      action: 'create',
      task: {
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate || undefined,
      },
      recentTasks: recentTasks.map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate || undefined,
      })),
      stats,
    });
    
    logger.info('Task module: task created successfully');
    
    return {
      modulePrompt,
      data: task,
    };
  } catch (error) {
    logger.error('Error in task module handler:', error);
    
    return {
      modulePrompt: `
You are helping with task management.
There was an error creating the task.
Please acknowledge the error and ask the user to try again.
Respond in ${user.language}.
      `.trim(),
    };
  }
}

/**
 * Обработчик изменения статуса задачи
 */
async function handleTaskStatusChange(
  user: User,
  message: string
): Promise<ModuleResult> {
  try {
    // Парсим команду
    const { query, status } = await parseTaskStatusChange(message, user.language);
    
    // Ищем задачу
    const tasks = await searchTasks(user.id, query);
    
    if (tasks.length === 0) {
      return {
        modulePrompt: `
You are helping with task management.
User tried to update task status to "${status}" but no matching task was found for query: "${query}".
Suggest they check the task name or show their current tasks.
Respond in ${user.language}.
        `.trim(),
      };
    }
    
    // Берём первую найденную задачу
    const task = tasks[0];
    
    // Обновляем статус
    const updated = await updateTask(task.id, { 
      status: status as 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' 
    });
    
    // Получаем статистику
    const stats = await getTaskStats(user.id);
    
    const modulePrompt = `
You are helping with task management.
User successfully changed task status.

Task: "${updated.title}"
Old status: ${task.status}
New status: ${updated.status}

Current stats:
- TODO: ${stats.todo}
- In Progress: ${stats.inProgress}
- Done: ${stats.done}

Confirm the status change and provide encouragement.
Respond in ${user.language}.
    `.trim();
    
    return {
      modulePrompt,
      data: updated,
    };
  } catch (error) {
    logger.error('Error updating task status:', error);
    throw error;
  }
}

/**
 * Обработчик показа списка задач
 */
export async function handleShowTasks(
  _ctx: Context,
  user: User,
  filter?: 'today' | 'tomorrow' | 'overdue' | 'all'
): Promise<ModuleResult> {
  try {
    const tasks = await getTasks(user.id, { status: 'TODO' });
    const stats = await getTaskStats(user.id);
    
    let filteredTasks = tasks;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (filter === 'today') {
      filteredTasks = tasks.filter(t => 
        t.dueDate && t.dueDate >= today && t.dueDate < tomorrow
      );
    } else if (filter === 'tomorrow') {
      filteredTasks = tasks.filter(t => 
        t.dueDate && t.dueDate >= tomorrow && t.dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      );
    } else if (filter === 'overdue') {
      filteredTasks = tasks.filter(t => t.dueDate && t.dueDate < now);
    }
    
    const modulePrompt = `
You are a task management assistant.
User requested their tasks${filter ? ` (filter: ${filter})` : ''}.

Tasks (${filteredTasks.length}):
${filteredTasks.slice(0, 10).map((t, i) => 
  `${i + 1}. [${t.priority}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate.toLocaleDateString()})` : ''}`
).join('\n')}

Stats:
- Total TODO: ${stats.todo}
- In Progress: ${stats.inProgress}
- Overdue: ${stats.overdue}

Present this information in a clear, organized way in ${user.language}.
Add brief motivation or suggestion if appropriate.
    `.trim();
    
    return {
      modulePrompt,
      data: { tasks: filteredTasks, stats },
    };
  } catch (error) {
    logger.error('Error showing tasks:', error);
    throw error;
  }
}
