import { prisma } from '../../database/client';
import type { Meal } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { MealInput } from './types';

export async function createMeal(data: MealInput) {
  const encrypted = encrypt(data.description);
  if (!encrypted) throw new Error('Encryption failed');
  
  return prisma.meal.create({
    data: {
      userId: data.userId,
      mealType: data.mealType,
      description: encrypted,
      calories: data.calories,
    },
  });
}

export async function getTodayMeals(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const meals = await prisma.meal.findMany({
    where: { userId, date: { gte: today } },
  });
  
  return meals.map((m: Meal) => ({ ...m, description: decrypt(m.description) || '' }));
}
