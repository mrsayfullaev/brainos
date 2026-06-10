/**
 * Tasks Module - AI Prompts
 * Шаблоны промптов для AI
 */

import type { User } from '@prisma/client';
import type { TaskStatus, TaskPriority, TaskStats } from './types';

interface TaskPromptContext {
  user: User;
  action: 'create' | 'update' | 'list' | 'complete';
  task?: {
    title: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate?: Date;
  };
  recentTasks?: Array<{
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date;
  }>;
  stats?: TaskStats;
}

/**
 * Строит промпт для задач
 */
export function buildTaskPrompt(context: TaskPromptContext): string {
  const { user, action, task, recentTasks, stats } = context;
  
  const parts: string[] = [];
  
  // Заголовок
  parts.push(`
=== TASK MODULE CONTEXT ===
You are helping with task management.
`);
  
  // Действие и текущая задача
  if (action === 'create' && task) {
    parts.push(`
ACTION: Create new task
Task: "${task.title}"
Priority: ${task.priority}
${task.dueDate ? `Due: ${task.dueDate.toLocaleDateString()}` : 'No deadline'}
`);
  } else if (action === 'complete' && task) {
    parts.push(`
ACTION: Complete task
Task: "${task.title}"
Status: ${task.status}
`);
  }
  
  // Недавние задачи
  if (recentTasks && recentTasks.length > 0) {
    parts.push(`
RECENT TODO TASKS:
${recentTasks.map((t, i) => 
  `${i + 1}. [${t.priority}] ${t.title}${t.dueDate ? ` (${t.dueDate.toLocaleDateString()})` : ''}`
).join('\n')}
`);
  }
  
  // Статистика
  if (stats) {
    parts.push(`
STATISTICS:
Total: ${stats.total}
- TODO: ${stats.todo}
- In Progress: ${stats.inProgress}
- Done: ${stats.done}
${stats.overdue > 0 ? `⚠️ OVERDUE: ${stats.overdue}` : ''}
${stats.dueToday > 0 ? `📅 DUE TODAY: ${stats.dueToday}` : ''}

By priority:
- Urgent: ${stats.byPriority.urgent}
- High: ${stats.byPriority.high}
- Medium: ${stats.byPriority.medium}
- Low: ${stats.byPriority.low}
`);
  }
  
  // Инструкции
  parts.push(`
YOUR TASK:
1. Confirm the ${action} action
2. ${stats?.overdue ? '**IMPORTANT:** Mention overdue tasks!' : 'Provide context from stats'}
3. ${stats?.dueToday ? 'Mention tasks due today' : ''}
4. Keep it SHORT (2-3 sentences)
5. Be encouraging and supportive
6. Respond in ${user.language}

DO NOT:
- List all tasks (only mention important ones)
- Be overwhelming
- Give unsolicited advice
`);
  
  return parts.join('\n').trim();
}
