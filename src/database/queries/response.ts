import { prisma } from '../client';
import { logger } from '../../utils/logger';
import { encrypt, decrypt } from '../../utils/encryption';

export interface AIResponseData {
  model: string;
  response: string;
  time: number;
}

export interface CreateAIResponseInput {
  userId: string;
  userMessage: string;
  winnerModel: string;
  winnerResponse: string;
  winnerTime: number;
  allResponses: AIResponseData[];
  moduleUsed?: string | null; // V2: опциональное поле для модулей
}

export async function createAIResponse(data: CreateAIResponseInput) {
  try {
    // Шифруем чувствительные данные
    const response = await prisma.aIResponse.create({
      data: {
        userId: data.userId,
        userMessage: encrypt(data.userMessage) || '',
        winnerModel: data.winnerModel,
        winnerResponse: encrypt(data.winnerResponse) || '',
        winnerTime: data.winnerTime,
        allResponses: data.allResponses as any,
        moduleUsed: data.moduleUsed || null, // V2: сохраняем используемый модуль
      },
    });
    
    // Расшифровываем данные перед возвратом
    return {
      ...response,
      userMessage: decrypt(response.userMessage) || '',
      winnerResponse: decrypt(response.winnerResponse) || '',
    };
  } catch (error) {
    logger.error('Error creating AI response:', error);
    throw error;
  }
}

export async function getUserResponses(userId: string, limit: number = 10) {
  try {
    const responses = await prisma.aIResponse.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    // Расшифровываем данные перед возвратом
    return responses.map(response => ({
      ...response,
      userMessage: decrypt(response.userMessage) || '',
      winnerResponse: decrypt(response.winnerResponse) || '',
    }));
  } catch (error) {
    logger.error('Error fetching user responses:', error);
    throw error;
  }
}

export async function getResponseStats(userId?: string) {
  try {
    const where = userId ? { userId } : {};
    
    const responses = await prisma.aIResponse.findMany({
      where,
      select: {
        winnerModel: true,
        winnerTime: true,
      },
    });

    const stats = responses.reduce((acc, response) => {
      if (!acc[response.winnerModel]) {
        acc[response.winnerModel] = { count: 0, totalTime: 0 };
      }
      acc[response.winnerModel].count++;
      acc[response.winnerModel].totalTime += response.winnerTime;
      return acc;
    }, {} as Record<string, { count: number; totalTime: number }>);

    // Calculate average times
    Object.keys(stats).forEach((model) => {
      const { count, totalTime } = stats[model];
      stats[model] = {
        count,
        totalTime,
        avgTime: Math.round(totalTime / count),
      } as any;
    });

    return stats;
  } catch (error) {
    logger.error('Error fetching response stats:', error);
    throw error;
  }
}
