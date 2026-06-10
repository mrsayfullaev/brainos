/**
 * Reminders Module - Database Queries
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import type { ReminderInput, ReminderStats } from './types';

// ==================== CREATE ====================

export async function createReminder(data: ReminderInput) {
  try {
    const encrypted = encrypt(data.text);
    if (!encrypted) {
      throw new Error('Failed to encrypt reminder text');
    }
    
    const reminder = await prisma.reminder.create({
      data: {
        userId: data.userId,
        text: encrypted,
        triggerAt: data.triggerAt,
        recurrence: data.recurrence || 'ONCE',
        recurrenceRule: data.recurrenceRule,
        completed: data.completed || false,
        notified: false,
      },
    });
    
    logger.info(`Reminder created: ${reminder.id} (${data.recurrence || 'ONCE'})`);
    
    return {
      ...reminder,
      text: decrypt(reminder.text) || data.text,
    };
  } catch (error) {
    logger.error('Error creating reminder:', error);
    throw error;
  }
}

// ==================== READ ====================

export async function getReminders(
  userId: string,
  filters?: {
    completed?: boolean;
    includeNotified?: boolean;
    limit?: number;
  }
) {
  try {
    const reminders = await prisma.reminder.findMany({
      where: {
        userId,
        completed: filters?.completed,
        ...(filters?.includeNotified === false ? { notified: false } : {}),
      },
      orderBy: { triggerAt: 'asc' },
      take: filters?.limit || 100,
    });
    
    return reminders.map(reminder => ({
      ...reminder,
      text: decrypt(reminder.text) || '',
    }));
  } catch (error) {
    logger.error('Error fetching reminders:', error);
    throw error;
  }
}

export async function getDueReminders(): Promise<Array<{
  id: string;
  userId: string;
  telegramId: bigint;
  text: string;
  triggerAt: Date;
  recurrence: string;
  recurrenceRule: string | null;
}>> {
  try {
    const now = new Date();
    
    const reminders = await prisma.reminder.findMany({
      where: {
        triggerAt: { lte: now },
        completed: false,
        notified: false,
      },
      include: {
        user: {
          select: {
            telegramId: true,
          },
        },
      },
    });
    
    return reminders.map(reminder => ({
      id: reminder.id,
      userId: reminder.userId,
      telegramId: reminder.user.telegramId,
      text: decrypt(reminder.text) || '',
      triggerAt: reminder.triggerAt,
      recurrence: reminder.recurrence,
      recurrenceRule: reminder.recurrenceRule,
    }));
  } catch (error) {
    logger.error('Error fetching due reminders:', error);
    throw error;
  }
}

// ==================== UPDATE ====================

export async function markReminderNotified(
  id: string,
  nextTrigger?: Date
) {
  try {
    await prisma.reminder.update({
      where: { id },
      data: {
        notified: true,
        ...(nextTrigger ? { triggerAt: nextTrigger, notified: false } : {}),
      },
    });
    
    logger.info(`Reminder marked as notified: ${id}${nextTrigger ? ' (next trigger set)' : ''}`);
  } catch (error) {
    logger.error('Error marking reminder as notified:', error);
    throw error;
  }
}

export async function completeReminder(id: string) {
  try {
    await prisma.reminder.update({
      where: { id },
      data: { completed: true },
    });
    
    logger.info(`Reminder completed: ${id}`);
  } catch (error) {
    logger.error('Error completing reminder:', error);
    throw error;
  }
}

// ==================== DELETE ====================

export async function deleteReminder(id: string) {
  try {
    await prisma.reminder.delete({ where: { id } });
    logger.info(`Reminder deleted: ${id}`);
  } catch (error) {
    logger.error('Error deleting reminder:', error);
    throw error;
  }
}

// ==================== ANALYTICS ====================

export async function getReminderStats(userId: string): Promise<ReminderStats> {
  try {
    const reminders = await getReminders(userId);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    return {
      total: reminders.length,
      active: reminders.filter(r => !r.completed && !r.notified).length,
      completed: reminders.filter(r => r.completed).length,
      overdue: reminders.filter(r => 
        !r.completed && !r.notified && r.triggerAt < now
      ).length,
      today: reminders.filter(r => 
        !r.completed && r.triggerAt >= today && r.triggerAt < tomorrow
      ).length,
      tomorrow: reminders.filter(r => 
        !r.completed && r.triggerAt >= tomorrow && r.triggerAt < dayAfterTomorrow
      ).length,
      recurring: reminders.filter(r => r.recurrence !== 'ONCE').length,
    };
  } catch (error) {
    logger.error('Error calculating reminder stats:', error);
    throw error;
  }
}
