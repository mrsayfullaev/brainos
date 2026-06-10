// Health Module
export type HealthType = 'SYMPTOM' | 'MEDICATION' | 'LAB_TEST' | 'DOCTOR_VISIT';
export interface HealthInput { userId: string; type: HealthType; description: string; metadata?: any; }
