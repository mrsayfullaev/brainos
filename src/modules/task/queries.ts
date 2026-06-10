/**
 * Tasks Module - Database Queries
 * CRUD операции с автоматическим шифрованием/дешифрованием
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import type { TaskInput, TaskWithSubtasks, TaskStats } from './types';

// ==================== CREATE ====================

function normalizeDueDate(dueDate: unknown): Date | null {
  if (dueDate == null || dueDate === '') return null;
  const d = dueDate instanceof Date ? dueDate : new Date(String(dueDate));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createTask(data: TaskInput) {
  try {
    const task = await prisma.task.create({
      data: {
        userId: data.userId,
        title: encrypt(data.title) || '',
        description: data.description ? encrypt(data.description) : null,
        priority: data.priority || 'MEDIUM',
        status: data.status || 'TODO',
        dueDate: normalizeDueDate(data.dueDate),
        parentId: data.parentId,
        tags: data.tags || [],
      },
    });
    
    logger.info(`Task created: ${task.id} (${data.priority || 'MEDIUM'})`);
    
    return {
      ...task,
      title: decrypt(task.title) || '',
      description: task.description ? decrypt(task.description) : null,
    };
  } catch (error) {
    logger.error('Error creating task:', error);
    throw error;
  }
}

// ==================== READ ====================

export async function getTasks(
  userId: string,
  filters?: {
    status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    parentId?: string | null;
    limit?: number;
  }
) {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: filters?.status,
        priority: filters?.priority,
        parentId: filters?.parentId,
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      take: filters?.limit || 100,
    });
    
    return tasks.map(task => ({
      ...task,
      title: decrypt(task.title) || '',
      description: task.description ? decrypt(task.description) : null,
    }));
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    throw error;
  }
}

export async function getTaskWithSubtasks(taskId: string): Promise<TaskWithSubtasks | null> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    
    if (!task) return null;
    
    return {
      ...task,
      title: decrypt(task.title) || '',
      description: task.description ? decrypt(task.description) : null,
      subtasks: task.subtasks.map(sub => ({
        ...sub,
        title: decrypt(sub.title) || '',
        description: sub.description ? decrypt(sub.description) : null,
        subtasks: [],
      })),
    } as TaskWithSubtasks;
  } catch (error) {
    logger.error('Error fetching task with subtasks:', error);
    throw error;
  }
}

export async function searchTasks(userId: string, query: string) {
  try {
    const tasks = await getTasks(userId);
    
    // Поиск по расшифрованным данным (не эффективно, но работает)
    return tasks.filter(task => {
      const titleMatch = task.title.toLowerCase().includes(query.toLowerCase());
      const descMatch = task.description?.toLowerCase().includes(query.toLowerCase());
      return titleMatch || descMatch;
    });
  } catch (error) {
    logger.error('Error searching tasks:', error);
    throw error;
  }
}

// ==================== UPDATE ====================

export async function updateTask(
  id: string,
  data: Partial<TaskInput>
) {
  try {
    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title ? (encrypt(data.title) || undefined) : undefined,
        description: data.description ? (encrypt(data.description) || undefined) : undefined,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate !== undefined ? normalizeDueDate(data.dueDate) : undefined,
        completedAt: data.status === 'DONE' ? new Date() : undefined,
      },
    });
    
    return {
      ...task,
      title: decrypt(task.title) || '',
      description: task.description ? decrypt(task.description) : null,
    };
  } catch (error) {
    logger.error('Error updating task:', error);
    throw error;
  }
}

// ==================== DELETE ====================

export async function deleteTask(id: string) {
  try {
    // Cascade delete subtasks
    await prisma.task.deleteMany({
      where: { parentId: id },
    });
    
    await prisma.task.delete({ where: { id } });
    logger.info(`Task deleted: ${id}`);
  } catch (error) {
    logger.error('Error deleting task:', error);
    throw error;
  }
}

// ==================== ANALYTICS ====================

export async function getTaskStats(userId: string): Promise<TaskStats> {
  try {
    const tasks = await getTasks(userId);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const stats: TaskStats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'TODO').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      done: tasks.filter(t => t.status === 'DONE').length,
      cancelled: tasks.filter(t => t.status === 'CANCELLED').length,
      overdue: tasks.filter(t => 
        t.status !== 'DONE' && 
        t.status !== 'CANCELLED' && 
        t.dueDate && 
        t.dueDate < now
      ).length,
      dueToday: tasks.filter(t => 
        t.status !== 'DONE' && 
        t.status !== 'CANCELLED' && 
        t.dueDate && 
        t.dueDate >= today && 
        t.dueDate < tomorrow
      ).length,
      dueTomorrow: tasks.filter(t => 
        t.status !== 'DONE' && 
        t.status !== 'CANCELLED' && 
        t.dueDate && 
        t.dueDate >= tomorrow && 
        t.dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      ).length,
      byPriority: {
        low: tasks.filter(t => t.priority === 'LOW').length,
        medium: tasks.filter(t => t.priority === 'MEDIUM').length,
        high: tasks.filter(t => t.priority === 'HIGH').length,
        urgent: tasks.filter(t => t.priority === 'URGENT').length,
      },
    };
    
    return stats;
  } catch (error) {
    logger.error('Error calculating task stats:', error);
    throw error;
  }
}
