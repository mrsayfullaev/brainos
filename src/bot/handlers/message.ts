import { BotContext } from '../index';
import { handleOnboardingMessage } from './start';
import { handleEditTextInput } from './settings';
import { i18n } from '../../localization';
import { logger } from '../../utils/logger';
import { routeToModule } from '../../modules/router';
import { transcribeAudio } from '../../modules/voice';
import { config } from '../../utils/config';
import type { User } from '@prisma/client';

export async function handleMessage(ctx: BotContext) {
  try {
    if (!ctx.user) {
      await ctx.reply('Ошибка. Попробуйте /start.');
      return;
    }

    const text = ctx.message?.text;
    if (!text) return;

    // Проверяем, идёт ли онбординг или редактирование настроек
    if (ctx.session && ctx.session.onboardingStep) {
      // Если это новый пользователь (нет tone/length и т.д.), значит это онбординг
      const isOnboarding = !ctx.user.tone && !ctx.user.length;
      
      if (isOnboarding) {
        // Новый пользователь - обрабатываем онбординг
        const onboardingHandled = await handleOnboardingMessage(ctx);
        if (onboardingHandled) return;
      } else {
        // Существующий пользователь - обрабатываем редактирование настроек
        const editHandled = await handleEditTextInput(ctx);
        if (editHandled) return;
      }
    }

    // Проверяем, заполнен ли профиль
    if (!ctx.user.name || !ctx.user.tone) {
      await ctx.reply(
        i18n.t('onboarding.ask_name', ctx.user.language) + 
        '\n\nИспользуйте /start для настройки профиля.'
      );
      return;
    }

    logger.info(`User message: ${ctx.user.telegramId} - "${text.substring(0, 50)}..."`);

    // Показываем индикатор "печатает..."
    await ctx.replyWithChatAction('typing');

    // V2: Используем module router вместо прямого вызова AI
    // Router автоматически определит, нужен ли модуль или стандартный V1 flow
    // Преобразуем ctx.user к полному типу User для router (в auth подгружаются доп. поля)
    const u = ctx.user as User;
    const fullUser: User = {
      ...ctx.user,
      createdAt: u.createdAt ?? new Date(),
      updatedAt: u.updatedAt ?? new Date(),
      username: u.username ?? null,
    } as User;
    await routeToModule(ctx, fullUser, text);

  } catch (error) {
    logger.error('Error in handleMessage:', error);
    await ctx.reply(i18n.t('errors.generic', ctx.user?.language ?? 'ru'));
  }
}

/**
 * V4 Voice Assistant: голосовое сообщение → Whisper → текст → тот же pipeline (routeToModule).
 */
export async function handleVoice(ctx: BotContext) {
  try {
    if (!ctx.user) {
      await ctx.reply('Ошибка. Попробуйте /start.');
      return;
    }
    if (!ctx.user.name || !ctx.user.tone) {
      await ctx.reply(
        i18n.t('onboarding.ask_name', ctx.user.language) +
          '\n\nИспользуйте /start для настройки профиля.'
      );
      return;
    }

    const voice = ctx.message?.voice ?? ctx.message?.video_note;
    if (!voice) return;

    await ctx.replyWithChatAction('typing');

    const file = await ctx.api.getFile(voice.file_id);
    const filePath = file.file_path;
    if (!filePath) {
      await ctx.reply('Не удалось получить файл.');
      return;
    }

    const url = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${filePath}`;
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn('Telegram file download failed', res.status);
      await ctx.reply('Не удалось загрузить голосовое сообщение.');
      return;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await transcribeAudio(buffer);
    if (!text) {
      await ctx.reply(
        ctx.user.language === 'ru'
          ? 'Не удалось распознать речь. Попробуйте ещё раз.'
          : 'Could not recognize speech. Try again.'
      );
      return;
    }

    logger.info(`Voice transcribed: ${ctx.user.telegramId} - "${text.substring(0, 50)}..."`);

    const u = ctx.user as User;
    const fullUser: User = {
      ...ctx.user,
      createdAt: u.createdAt ?? new Date(),
      updatedAt: u.updatedAt ?? new Date(),
      username: u.username ?? null,
    } as User;
    await routeToModule(ctx, fullUser, text);
  } catch (error) {
    logger.error('Error in handleVoice:', error);
    await ctx.reply(i18n.t('errors.generic', ctx.user?.language ?? 'ru'));
  }
}
