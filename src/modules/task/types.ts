/**
 * Tasks Module - TypeScript Types
 * Модуль для управления задачами с приоритетами и подзадачами
 */

// Приоритеты задач
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// Статусы задач
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

// Результат парсинга задачи
export interface ParsedTask {
  title: string;
  priority?: TaskPriority;
  dueDate?: Date;
  tags?: string[];
  description?: string;
}

// Входные данные для создания задачи
export interface TaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date;
  parentId?: string; // Для подзадач
  tags?: string[];
}

// Задача с подзадачами
export interface TaskWithSubtasks {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  parentId?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  subtasks?: TaskWithSubtasks[];
}

// Статистика по задачам
export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  cancelled: number;
  overdue: number;
  dueToday: number;
  dueTomorrow: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

// Контекст модуля для AI
export interface TaskContext {
  recentTasks: Array<{
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date;
  }>;
  stats: TaskStats;
}
