import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createMeal, getTodayMeals } from './queries';

export async function handleFoodMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const now = new Date();
  const hour = now.getHours();
  
  let mealType: any = 'SNACK';
  if (hour >= 6 && hour < 11) mealType = 'BREAKFAST';
  else if (hour >= 11 && hour < 16) mealType = 'LUNCH';
  else if (hour >= 16 && hour < 22) mealType = 'DINNER';
  
  const description = message.replace(/еда|food/gi, '').trim();
  
  await createMeal({ userId: user.id, mealType, description });
  
  const today = await getTodayMeals(user.id);
  const totalCalories = today.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
  
  return {
    modulePrompt: `Meal logged (${mealType}). Today: ${totalCalories} cal. Respond in ${user.language}.`,
  };
}
