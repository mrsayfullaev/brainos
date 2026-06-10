/**
 * Habits Module - Queries (V3)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { HabitStats } from './types';

export async function createHabit(params: {
  userId: string;
  name: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'CUSTOM';
  targetDays?: number[];
}) {
  const encName = encrypt(params.name);
  if (!encName) throw new Error('Encryption failed');
  return prisma.habit.create({
    data: {
      userId: params.userId,
      name: encName,
      frequency: params.frequency || 'DAILY',
      targetDays: params.targetDays || [],
    },
  });
}

export async function getHabits(userId: string, activeOnly = true) {
  const habits = await prisma.habit.findMany({
    where: { userId, ...(activeOnly ? { active: true } : {}) },
    include: { completions: { orderBy: { date: 'desc' }, take: 365 } },
  });
  return habits.map((h) => ({
    ...h,
    name: decrypt(h.name) || '',
    completions: h.completions,
  }));
}

export async function addCompletion(habitId: string, userId: string, note?: string) {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new Error('Habit not found');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.habitCompletion.upsert({
    where: {
      habitId_date: { habitId, date: today },
    },
    create: { habitId, date: today, note: note ? encrypt(note) : null },
    update: { note: note ? encrypt(note) : undefined },
  });
}

export async function getStreak(habitId: string): Promise<HabitStats> {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    include: { completions: { orderBy: { date: 'desc' } } },
  });
  if (!habit) return { currentStreak: 0, longestStreak: 0, totalCompletions: 0 };

  const dates = habit.completions.map((c) => new Date(c.date).toISOString().slice(0, 10));

  let currentStreak = 0;
  for (let i = 0; i < 366; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dates.includes(key)) currentStreak++;
    else if (i > 0) break;
  }

  let longestStreak = 0;
  let run = 0;
  const sorted = [...dates].sort();
  for (let i = 0; i < sorted.length; i++) {
    run++;
    const next = sorted[i + 1];
    const curr = new Date(sorted[i]).getTime();
    const nextTime = next ? new Date(next).getTime() : 0;
    if (nextTime - curr > 86400000 * 2) {
      longestStreak = Math.max(longestStreak, run);
      run = 0;
    }
  }
  longestStreak = Math.max(longestStreak, run);

  return {
    currentStreak,
    longestStreak,
    totalCompletions: dates.length,
  };
}

export async function getHeatmapData(habitId: string, year: number): Promise<Record<string, boolean>> {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const completions = await prisma.habitCompletion.findMany({
    where: { habitId, date: { gte: start, lte: end } },
  });
  const set = new Set(completions.map((c) => new Date(c.date).toISOString().slice(0, 10)));
  const out: Record<string, boolean> = {};
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out[d.toISOString().slice(0, 10)] = set.has(d.toISOString().slice(0, 10));
  }
  return out;
}
