import { prisma } from '../client';
import { logger } from '../../utils/logger';
import { encrypt, decrypt } from '../../utils/encryption';

export interface CreateUserInput {
  telegramId: bigint;
  name?: string;
  language: string;
}

export interface UpdateUserPreferencesInput {
  tone?: string;
  length?: string;
  emoji?: string;
  structure?: string;
  style?: string;
  detail?: string;
  customPrompt?: string;
  timezone?: string | null;
}

export async function findUserByTelegramId(telegramId: bigint) {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });
    
    if (!user) return null;
    
    // Расшифровываем данные перед возвратом
    return {
      ...user,
      name: user.name ? decrypt(user.name) : null,
      customPrompt: user.customPrompt ? decrypt(user.customPrompt) : null,
    };
  } catch (error) {
    logger.error('Error finding user by telegram ID:', error);
    throw error;
  }
}

export async function createUser(data: CreateUserInput) {
  try {
    // Шифруем данные перед сохранением
    const encryptedData = {
      ...data,
      name: data.name ? encrypt(data.name) : null,
    };
    
    const user = await prisma.user.create({
      data: encryptedData,
    });
    
    // Расшифровываем данные перед возвратом
    return {
      ...user,
      name: user.name ? decrypt(user.name) : null,
      customPrompt: user.customPrompt ? decrypt(user.customPrompt) : null,
    };
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(telegramId: bigint, data: Partial<CreateUserInput>) {
  try {
    // Шифруем данные перед сохранением
    const encryptedData: any = { ...data };
    if (data.name !== undefined) {
      encryptedData.name = data.name ? encrypt(data.name) : null;
    }
    
    const user = await prisma.user.update({
      where: { telegramId },
      data: encryptedData,
    });
    
    // Расшифровываем данные перед возвратом
    return {
      ...user,
      name: user.name ? decrypt(user.name) : null,
      customPrompt: user.customPrompt ? decrypt(user.customPrompt) : null,
    };
  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
}

export async function updateUserPreferences(
  telegramId: bigint,
  preferences: UpdateUserPreferencesInput
) {
  try {
    // Шифруем customPrompt если он передан
    const encryptedPreferences: any = { ...preferences };
    if (preferences.customPrompt !== undefined) {
      encryptedPreferences.customPrompt = preferences.customPrompt ? encrypt(preferences.customPrompt) : null;
    }
    
    const user = await prisma.user.update({
      where: { telegramId },
      data: encryptedPreferences,
    });
    
    // Расшифровываем данные перед возвратом
    return {
      ...user,
      name: user.name ? decrypt(user.name) : null,
      customPrompt: user.customPrompt ? decrypt(user.customPrompt) : null,
    };
  } catch (error) {
    logger.error('Error updating user preferences:', error);
    throw error;
  }
}

/** Фиксирует согласие на обработку персональных данных */
export async function giveConsent(telegramId: bigint): Promise<void> {
  await prisma.user.update({
    where: { telegramId },
    data: { consentGivenAt: new Date() },
  });
  logger.info(`Consent given: ${telegramId}`);
}

export async function findOrCreateUser(telegramId: bigint, language: string = 'ru') {
  try {
    let user = await findUserByTelegramId(telegramId);

    if (!user) {
      user = await createUser({ telegramId, language });
      logger.info(`New user created: ${telegramId}`);
    }

    return user;
  } catch (error) {
    logger.error('Error in findOrCreateUser:', error);
    throw error;
  }
}

export async function deleteUser(telegramId: bigint) {
  try {
    // Prisma автоматически удалит связанные AIResponse благодаря onDelete: Cascade
    await prisma.user.delete({
      where: { telegramId },
    });
    
    logger.info(`User deleted: ${telegramId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting user:', error);
    throw error;
  }
}
