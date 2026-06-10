import { prisma } from '../../database/client';
import type { WaterInput } from './types';

export async function addWater(data: WaterInput) {
  return prisma.waterIntake.create({ data });
}

export async function getTodayWater(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const intakes = await prisma.waterIntake.findMany({
    where: { userId, date: { gte: today } },
  });
  
    return intakes.reduce((sum: number, i) => sum + i.amount, 0);
}

export async function getWaterGoal(userId: string) {
  let goal = await prisma.waterGoal.findUnique({ where: { userId } });
  
  if (!goal) {
    goal = await prisma.waterGoal.create({
      data: { userId, dailyGoal: 2000 },
    });
  }
  
  return goal.dailyGoal;
}
