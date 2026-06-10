import { prisma } from '../../database/client';
import type { Workout } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { WorkoutInput } from './types';

export async function createWorkout(data: WorkoutInput) {
  return prisma.workout.create({
    data: {
      userId: data.userId,
      type: data.type,
      exercises: data.exercises,
      duration: data.duration,
      notes: data.notes ? encrypt(data.notes) : null,
    },
  });
}

export async function getWorkouts(userId: string, limit = 10) {
  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  });
  
  return workouts.map((w: Workout) => ({ ...w, notes: w.notes ? decrypt(w.notes) : null }));
}
