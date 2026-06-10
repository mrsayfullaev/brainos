import { Bot } from 'grammy';
import { BotContext } from './index';
import { logger } from '../utils/logger';

// Описания команд для каждого языка
const commands = {
  ru: [
    { command: 'start', description: 'Запустить бот / Настроить' },
    { command: 'settings', description: 'Изменить настройки' },
    { command: 'help', description: 'Помощь и информация' },
    { command: 'premium', description: 'Тариф и оплата' },
    { command: 'notion', description: 'Подключить Notion' },
    { command: 'inbox', description: 'Inbox Gmail' },
  ],
  en: [
    { command: 'start', description: 'Start bot / Setup' },
    { command: 'settings', description: 'Change settings' },
    { command: 'help', description: 'Help and info' },
    { command: 'premium', description: 'Plan and billing' },
    { command: 'notion', description: 'Connect Notion' },
    { command: 'inbox', description: 'Gmail Inbox' },
  ],
  es: [
    { command: 'start', description: 'Iniciar bot / Configurar' },
    { command: 'settings', description: 'Cambiar configuración' },
    { command: 'help', description: 'Ayuda e información' },
    { command: 'premium', description: 'Plan y facturación' },
    { command: 'notion', description: 'Conectar Notion' },
    { command: 'inbox', description: 'Bandeja Gmail' },
  ],
  uz: [
    { command: 'start', description: 'Botni boshlash / Sozlash' },
    { command: 'settings', description: 'Sozlamalarni o\'zgartirish' },
    { command: 'help', description: 'Yordam va ma\'lumot' },
    { command: 'premium', description: 'Tarif va to\'lov' },
    { command: 'notion', description: 'Notion ulash' },
    { command: 'inbox', description: 'Gmail inbox' },
  ],
  ar: [
    { command: 'start', description: 'بدء البوت / إعداد' },
    { command: 'settings', description: 'تغيير الإعدادات' },
    { command: 'help', description: 'مساعدة ومعلومات' },
    { command: 'premium', description: 'الخطة والفوترة' },
    { command: 'notion', description: 'ربط Notion' },
    { command: 'inbox', description: 'صندوق Gmail' },
  ],
  tr: [
    { command: 'start', description: 'Botu başlat / Kur' },
    { command: 'settings', description: 'Ayarları değiştir' },
    { command: 'help', description: 'Yardım ve bilgi' },
    { command: 'premium', description: 'Plan ve faturalandırma' },
    { command: 'notion', description: 'Notion bağla' },
    { command: 'inbox', description: 'Gmail gelen kutusu' },
  ],
};

/**
 * Устанавливает команды бота по умолчанию (английский)
 */
export async function setupBotCommands(bot: Bot<BotContext>) {
  try {
    logger.info('Setting up default bot commands...');

    // Устанавливаем команды по умолчанию (английский)
    await bot.api.setMyCommands(commands.en);

    logger.info('Default bot commands setup completed successfully');
  } catch (error) {
    logger.error('Error setting up bot commands:', error);
  }
}

/**
 * Устанавливает команды для конкретного пользователя на его языке
 */
export async function setUserCommands(bot: Bot<BotContext>, userId: number, language: string) {
  try {
    const userCommands = commands[language as keyof typeof commands] || commands.en;
    
    await bot.api.setMyCommands(userCommands, {
      scope: {
        type: 'chat',
        chat_id: userId,
      },
    });
    
    logger.debug(`Commands set for user ${userId} in language: ${language}`);
  } catch (error) {
    logger.error(`Error setting commands for user ${userId}:`, error);
  }
}
