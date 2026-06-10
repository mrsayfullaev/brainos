// Subscription Module
export interface SubscriptionInput { userId: string; name: string; cost: number; period: 'MONTHLY' | 'YEARLY'; nextPayment: Date; }
