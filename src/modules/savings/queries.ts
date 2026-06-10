import { prisma } from '../../database/client';
import type { SavingsGoal } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { SavingsGoalInput } from './types';

export async function createSavingsGoal(data: SavingsGoalInput) {
  return prisma.savingsGoal.create({
    data: {
      userId: data.userId,
      name: encrypt(data.name) || '',
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount || 0,
      deadline: data.deadline,
      achieved: false,
    },
  });
}

export async function getSavingsGoals(userId: string) {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId, achieved: false },
    orderBy: { deadline: 'asc' },
  });
  
  return goals.map((g: SavingsGoal) => ({ ...g, name: decrypt(g.name) || '' }));
}
