// Food Module
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export interface MealInput { userId: string; mealType: MealType; description: string; calories?: number; }
