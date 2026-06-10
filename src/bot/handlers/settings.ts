import { InlineKeyboard, InputFile } from 'grammy';
import type { User } from '@prisma/client';
import { BotContext } from '../index';
import { i18n } from '../../localization';
import { exportUserData } from '../../database/queries/export';
import type { Language } from '../../localization';
import { logger } from '../../utils/logger';
import { updateUser, updateUserPreferences, deleteUser } from '../../database/queries/user';
import { bot } from '../index';
import { setUserCommands } from '../commands';
import { getOrCreatePlanSubscription, getRemainingAIRequests } from '../../modules/premium';
import { getAccessibleModules, ALL_MODULES } from '../../modules/premium/access';
import { getDocsPageUrl } from '../../utils/docs-url';
import { UTC_OFFSET_OPTIONS } from '../../utils/timezone';

const TIER_LABELS: Record<string, string> = { FREE: 'Free', PRO: 'Pro', TEAM: 'Team' };

export async function handleSettings(ctx: BotContext) {
  try {
    if (!ctx.user) {
      await ctx.reply('Ошибка авторизации.');
      return;
    }

    const lang = ctx.user.language;
    const plan = await getOrCreatePlanSubscription(ctx.user.id);
    const tierLabel = TIER_LABELS[plan.tier] ?? plan.tier;

    // Формируем текст настроек
    let settingsText = i18n.t('settings.title', lang) + '\n\n';
    settingsText += i18n.t('settings.plan', lang, { tier: tierLabel }) + '\n';
    const remaining = await getRemainingAIRequests(ctx.user.id);
    if (remaining !== null) {
      settingsText += i18n.t('settings.ai_remaining', lang, { remaining }) + '\n';
    }
    settingsText += i18n.t('settings.name', lang, { name: ctx.user.name || 'Не указано' }) + '\n';
    settingsText += i18n.t('settings.language', lang, { 
      language: i18n.t(`languages.${ctx.user.language}`, lang) 
    }) + '\n';
    settingsText += i18n.t('settings.timezone', lang, { timezone: (ctx.user as { timezone?: string | null }).timezone || i18n.t('settings.timezone_not_set', lang) }) + '\n\n';
    
    settingsText += i18n.t('settings.format_title', lang) + '\n';
    
    // Переводим значения настроек
    const toneKey = `preferences.tone_${ctx.user.tone || 'neutral'}`;
    const lengthKey = `preferences.length_${ctx.user.length || 'medium'}`;
    const emojiKey = `preferences.emoji_${ctx.user.emoji || 'moderate'}`;
    const structureKey = `preferences.structure_${ctx.user.structure || 'mixed'}`;
    const styleKey = `preferences.style_${ctx.user.style || 'friend'}`;
    const detailKey = `preferences.detail_${ctx.user.detail || 'with_context'}`;
    
    settingsText += i18n.t('settings.tone', lang, { tone: i18n.t(toneKey, lang) }) + '\n';
    settingsText += i18n.t('settings.length', lang, { length: i18n.t(lengthKey, lang) }) + '\n';
    settingsText += i18n.t('settings.emoji', lang, { emoji: i18n.t(emojiKey, lang) }) + '\n';
    settingsText += i18n.t('settings.structure', lang, { 
      structure: i18n.t(structureKey, lang) 
    }) + '\n';
    settingsText += i18n.t('settings.style', lang, { style: i18n.t(styleKey, lang) }) + '\n';
    settingsText += i18n.t('settings.detail', lang, { detail: i18n.t(detailKey, lang) }) + '\n';
    
    if (ctx.user.customPrompt) {
      settingsText += '\n' + i18n.t('settings.custom_instructions', lang, { 
        customPrompt: ctx.user.customPrompt 
      });
    }
    
    settingsText += '\n\n' + i18n.t('settings.edit_prompt', lang);
    settingsText += '\n\n' + i18n.t('settings.privacy_link_label', lang) + ' ' + getDocsPageUrl(lang, 'privacy');

    const keyboard = new InlineKeyboard()
      .text(i18n.t('settings.plan_details', lang), 'plan_details')
      .row()
      .text(i18n.t('buttons.edit_settings', lang), 'edit_settings')
      .row()
      .text(i18n.t('settings.export_data', lang), 'export_data')
      .row()
      .text(i18n.t('settings.delete_account', lang), 'delete_account');
    
    await ctx.reply(settingsText, { reply_markup: keyboard });
    
    logger.info(`Settings shown to user: ${ctx.user.telegramId}`);
  } catch (error) {
    logger.error('Error in handleSettings:', error);
    await ctx.reply(i18n.t('errors.generic', ctx.user?.language ?? 'ru'));
  }
}

// Обработчик для редактирования настроек
export async function handleEditSettings(ctx: BotContext) {
  try {
    if (!ctx.user) return;
    
    const lang = ctx.user.language;
    
    // Упрощенное меню редактирования - только основные разделы
    const keyboard = new InlineKeyboard()
      .text(i18n.t('settings.edit_name', lang), 'edit:name')
      .row()
      .text(i18n.t('settings.edit_language', lang), 'edit:language')
      .row()
      .text(i18n.t('settings.edit_timezone', lang), 'edit:timezone')
      .row()
      .text(i18n.t('settings.edit_format', lang), 'edit:format')
      .row()
      .text(i18n.t('settings.edit_custom', lang), 'edit:custom')
      .row()
      .text(i18n.t('buttons.back', lang), 'back_to_settings');
    
    await ctx.reply(i18n.t('settings.edit_menu_title', lang), { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Error in handleEditSettings:', error);
  }
}

// Обработчик выбора параметра для редактирования
export async function handleEditParameter(ctx: BotContext, parameter: string) {
  try {
    if (!ctx.user) return;
    
    const lang = ctx.user.language;
    const session = ctx.session;
    
    // Специальный case для "Формат общения" - запускаем полную последовательность вопросов
    if (parameter === 'format') {
      session.onboardingStep = 'tone';
      session.onboardingData = {};
      
      const keyboard = new InlineKeyboard()
        .text(i18n.t('preferences.tone_formal', lang), 'tone:formal')
        .row()
        .text(i18n.t('preferences.tone_friendly', lang), 'tone:friendly')
        .row()
        .text(i18n.t('preferences.tone_neutral', lang), 'tone:neutral');
      
      await ctx.reply(i18n.t('onboarding.ask_tone', lang), { reply_markup: keyboard });
      await ctx.answerCallbackQuery();
      return;
    }
    
    // Для текстовых полей (имя, custom prompt)
    if (parameter === 'name') {
      session.onboardingStep = 'name';
      session.onboardingData = {};
      await ctx.reply(i18n.t('onboarding.ask_name', lang));
      await ctx.answerCallbackQuery();
      return;
    }
    
    if (parameter === 'custom') {
      session.onboardingStep = 'custom';
      session.onboardingData = {};
      await ctx.reply(i18n.t('onboarding.ask_custom', lang));
      await ctx.answerCallbackQuery();
      return;
    }
    
    // Для языка
    if (parameter === 'language') {
      const keyboard = new InlineKeyboard()
        .text('🇷🇺 Русский', 'lang:ru')
        .text('🇬🇧 English', 'lang:en')
        .row()
        .text('🇪🇸 Español', 'lang:es')
        .text('🇺🇿 O\'zbek', 'lang:uz')
        .row()
        .text('🇸🇦 العربية', 'lang:ar')
        .text('🇹🇷 Türkçe', 'lang:tr');
      
      await ctx.reply(i18n.t('onboarding.ask_language', lang), { reply_markup: keyboard });
      await ctx.answerCallbackQuery();
      return;
    }
    
    // Часовой пояс (UTC)
    if (parameter === 'timezone') {
      const keyboard = new InlineKeyboard();
      const opts = UTC_OFFSET_OPTIONS;
      const perRow = 8;
      for (let i = 0; i < opts.length; i += perRow) {
        const row = opts.slice(i, i + perRow);
        row.forEach((tz) => keyboard.text(tz, `timezone:${tz}`));
        keyboard.row();
      }
      await ctx.reply(i18n.t('settings.edit_timezone_prompt', lang), { reply_markup: keyboard });
      await ctx.answerCallbackQuery();
      return;
    }
    
  } catch (error) {
    logger.error('Error in handleEditParameter:', error);
    await ctx.answerCallbackQuery('Ошибка');
  }
}

// Обработчик текстового ввода при редактировании
export async function handleEditTextInput(ctx: BotContext): Promise<boolean> {
  const session = ctx.session;
  if (!session || !ctx.user) return false;
  
  const text = ctx.message?.text;
  if (!text) return false;
  
  const step = session.onboardingStep;
  if (!step) return false;
  
  try {
    const lang = ctx.user.language;
    
    if (step === 'name') {
      await updateUser(ctx.user.telegramId, { name: text });
      ctx.user.name = text;
      await ctx.reply(`${i18n.t('settings.edit_name', lang)}: ${text}`);
      
      // Очищаем сессию
      session.onboardingStep = null;
      session.onboardingData = {};
      
      // Показываем обновленные настройки
      await handleSettings(ctx);
      return true;
    } else if (step === 'custom') {
      await updateUserPreferences(ctx.user.telegramId, { customPrompt: text });
      ctx.user.customPrompt = text;
      await ctx.reply(i18n.t('settings.edit_custom', lang));
      
      // Очищаем сессию
      session.onboardingStep = null;
      session.onboardingData = {};
      
      // Показываем обновленные настройки
      await handleSettings(ctx);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error in handleEditTextInput:', error);
    return false;
  }
}

// Обработчик callback для сохранения изменений настроек
export async function handleSettingsCallback(ctx: BotContext, action: string, value: string) {
  try {
    if (!ctx.user) return;
    
    const lang = ctx.user.language;
    const session = ctx.session;
    
    // Выбор часового пояса
    if (action === 'timezone') {
      await updateUserPreferences(ctx.user.telegramId, { timezone: value });
      (ctx.user as { timezone?: string | null }).timezone = value;
      await ctx.reply(i18n.t('settings.timezone_updated', lang, { timezone: value }));
      await handleSettings(ctx);
      await ctx.answerCallbackQuery();
      return;
    }
    
    // Обработка последовательности вопросов для "Формат общения"
    if (session.onboardingStep && session.onboardingStep !== 'name' && session.onboardingStep !== 'custom') {
      // Последовательность как при онбординге
      if (action === 'tone') {
        session.onboardingData.tone = value;
        session.onboardingStep = 'length';
        
        const keyboard = new InlineKeyboard()
          .text(i18n.t('preferences.length_brief', lang), 'length:brief')
          .row()
          .text(i18n.t('preferences.length_medium', lang), 'length:medium')
          .row()
          .text(i18n.t('preferences.length_detailed', lang), 'length:detailed');
        
        await ctx.reply(i18n.t('onboarding.ask_length', lang), { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        return;
      } else if (action === 'length') {
        session.onboardingData.length = value;
        session.onboardingStep = 'emoji';
        
        const keyboard = new InlineKeyboard()
          .text(i18n.t('preferences.emoji_yes', lang), 'emoji:yes')
          .row()
          .text(i18n.t('preferences.emoji_no', lang), 'emoji:no')
          .row()
          .text(i18n.t('preferences.emoji_moderate', lang), 'emoji:moderate');
        
        await ctx.reply(i18n.t('onboarding.ask_emoji', lang), { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        return;
      } else if (action === 'emoji') {
        session.onboardingData.emoji = value;
        session.onboardingStep = 'structure';
        
        const keyboard = new InlineKeyboard()
          .text(i18n.t('preferences.structure_lists', lang), 'structure:lists')
          .row()
          .text(i18n.t('preferences.structure_paragraphs', lang), 'structure:paragraphs')
          .row()
          .text(i18n.t('preferences.structure_mixed', lang), 'structure:mixed');
        
        await ctx.reply(i18n.t('onboarding.ask_structure', lang), { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        return;
      } else if (action === 'structure') {
        session.onboardingData.structure = value;
        session.onboardingStep = 'style';
        
        const keyboard = new InlineKeyboard()
          .text(i18n.t('preferences.style_expert', lang), 'style:expert')
          .row()
          .text(i18n.t('preferences.style_friend', lang), 'style:friend')
          .row()
          .text(i18n.t('preferences.style_teacher', lang), 'style:teacher');
        
        await ctx.reply(i18n.t('onboarding.ask_style', lang), { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        return;
      } else if (action === 'style') {
        session.onboardingData.style = value;
        session.onboardingStep = 'detail';
        
        const keyboard = new InlineKeyboard()
          .text(i18n.t('preferences.detail_answer_only', lang), 'detail:answer_only')
          .row()
          .text(i18n.t('preferences.detail_with_context', lang), 'detail:with_context')
          .row()
          .text(i18n.t('preferences.detail_maximum', lang), 'detail:maximum');
        
        await ctx.reply(i18n.t('onboarding.ask_detail', lang), { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        return;
      } else if (action === 'detail') {
        // Последний параметр - сохраняем все
        session.onboardingData.detail = value;
        
        await updateUserPreferences(ctx.user.telegramId, {
          tone: session.onboardingData.tone,
          length: session.onboardingData.length,
          emoji: session.onboardingData.emoji,
          structure: session.onboardingData.structure,
          style: session.onboardingData.style,
          detail: value,
        });
        
        // Обновляем локальный объект
        ctx.user.tone = session.onboardingData.tone || null;
        ctx.user.length = session.onboardingData.length || null;
        ctx.user.emoji = session.onboardingData.emoji || null;
        ctx.user.structure = session.onboardingData.structure || null;
        ctx.user.style = session.onboardingData.style || null;
        ctx.user.detail = value;
        
        // Очищаем сессию
        session.onboardingStep = null;
        session.onboardingData = {};
        
        await ctx.answerCallbackQuery();
        await ctx.reply(i18n.t('settings.format_updated', lang));
        
        logger.info(`Format settings updated for user: ${ctx.user.telegramId}`);
        
        await handleSettings(ctx);
        return;
      }
    }
    
    // Обработка изменения языка (не part of последовательности)
    if (action === 'lang') {
      const lang = value as Language;
      await updateUser(ctx.user.telegramId, { language: value });
      ctx.user.language = lang;
      
      // Устанавливаем команды на новом языке
      if (ctx.from?.id) {
        await setUserCommands(bot, ctx.from.id, value);
      }
      
      // Обновляем язык для дальнейших сообщений
      await ctx.answerCallbackQuery();
      await ctx.reply(`${i18n.t('settings.edit_language', lang)}: ${i18n.t(`languages.${value}`, lang)}`);
      
      logger.info(`Language updated to ${value} for user: ${ctx.user.telegramId}`);
      
      await handleSettings(ctx);
    }
    
  } catch (error) {
    logger.error('Error in handleSettingsCallback:', error);
    await ctx.answerCallbackQuery('Ошибка');
  }
}

// Обработчик удаления аккаунта
export async function handleDeleteAccount(ctx: BotContext) {
  try {
    if (!ctx.user) return;
    
    const lang = ctx.user.language;
    
    // Показываем предупреждение с подтверждением
    const keyboard = new InlineKeyboard()
      .text(i18n.t('settings.confirm_delete', lang), 'confirm_delete')
      .row()
      .text(i18n.t('buttons.cancel', lang), 'back_to_settings');
    
    await ctx.reply(i18n.t('settings.delete_warning', lang), { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Error in handleDeleteAccount:', error);
    await ctx.answerCallbackQuery('Ошибка');
  }
}

// Обработчик подтверждения удаления аккаунта
export async function handleConfirmDelete(ctx: BotContext) {
  try {
    if (!ctx.user) return;
    
    const lang = ctx.user.language;
    const telegramId = ctx.user.telegramId;
    const chatId = ctx.chat?.id;
    
    await ctx.answerCallbackQuery();
    
    // Показываем процесс удаления
    const deletingMsg = await ctx.reply(i18n.t('settings.deleting_in_progress', lang));
    
    // 1. Удаляем все сообщения бота из чата (что возможно по Telegram API)
    let deletedMessagesCount = 0;
    if (chatId) {
      try {
        // Получаем текущий message_id
        const currentMessageId = deletingMsg.message_id;
        
        // Пытаемся удалить последние 100 сообщений бота
        // (Telegram API позволяет удалять только сообщения бота)
        for (let i = 1; i <= 100; i++) {
          try {
            await ctx.api.deleteMessage(chatId, currentMessageId - i);
            deletedMessagesCount++;
          } catch (e) {
            // Игнорируем ошибки - сообщение может быть уже удалено или не от бота
          }
        }
        
        logger.info(`Deleted ${deletedMessagesCount} bot messages for user: ${telegramId}`);
      } catch (error) {
        logger.warn('Error deleting bot messages:', error);
      }
    }
    
    // 2. Удаляем пользователя и все его данные из БД
    await deleteUser(telegramId);
    
    // 3. Очищаем сессию
    ctx.session.onboardingStep = null;
    ctx.session.onboardingData = {};
    
    // 4. Отправляем финальное сообщение с инструкцией
    const finalMessage = [
      i18n.t('settings.account_deleted', lang),
      '',
      i18n.t('settings.data_deleted', lang),
      deletedMessagesCount > 0 
        ? i18n.t('settings.bot_messages_deleted', lang, { count: deletedMessagesCount })
        : '',
      '',
      i18n.t('settings.user_messages_instruction', lang),
      '1. ' + i18n.t('settings.instruction_step1', lang),
      '2. ' + i18n.t('settings.instruction_step2', lang),
      '3. ' + i18n.t('settings.instruction_step3', lang),
    ].filter(Boolean).join('\n');
    
    await ctx.reply(finalMessage);
    
    // Удаляем сообщение "Удаление..."
    try {
      await ctx.api.deleteMessage(chatId!, deletingMsg.message_id);
    } catch (e) {
      // Ignore
    }
    
    logger.info(`Account and messages deleted for user: ${telegramId}, bot messages deleted: ${deletedMessagesCount}`);
  } catch (error) {
    logger.error('Error in handleConfirmDelete:', error);
    await ctx.reply('Ошибка при удалении аккаунта');
  }
}

/** Показать подробности о доступных модулях по тарифу */
export async function handlePlanDetails(ctx: BotContext) {
  try {
    if (!ctx.user) return;
    await ctx.answerCallbackQuery();

    const lang = ctx.user.language;
    const plan = await getOrCreatePlanSubscription(ctx.user.id);
    const accessibleModules = await getAccessibleModules(ctx.user as User);
    const isProOrTeam = accessibleModules.length >= ALL_MODULES.length;

    let text: string;
    if (isProOrTeam) {
      text = i18n.t('settings.plan_details_pro', lang, { count: ALL_MODULES.length });
    } else {
      const bonusModule = plan?.bonusModule ?? null;
      const baseModules = accessibleModules.filter((m) => m !== bonusModule);
      const baseList = baseModules.map((m) => i18n.t(`help.modules.${m}`, lang)).join('\n• ');
      const bonusLine = bonusModule
        ? i18n.t('settings.plan_details_bonus_line', lang, {
            bonus: i18n.t(`help.modules.${bonusModule}`, lang),
          })
        : '';
      text = i18n.t('settings.plan_details_free', lang, {
        baseModules: baseList,
        bonusLine,
      });
    }

    await ctx.reply(text);
  } catch (error) {
    logger.error('Error in handlePlanDetails:', error);
    await ctx.reply(i18n.t('errors.generic', ctx.user?.language ?? 'ru'));
  }
}

/** Экспорт всех данных пользователя в JSON (GDPR Right to Data Portability) */
export async function handleExportData(ctx: BotContext) {
  try {
    if (!ctx.user) return;

    const lang = ctx.user.language;
    await ctx.answerCallbackQuery();
    const msg = await ctx.reply(i18n.t('settings.export_processing', lang));

    const data = await exportUserData(ctx.user.id);
    const json = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(json, 'utf-8');
    const filename = `brainos-export-${ctx.user.id}-${new Date().toISOString().slice(0, 10)}.json`;

    await ctx.replyWithDocument(new InputFile(buffer, filename), {
      caption: i18n.t('settings.export_sent', lang),
    });

    try {
      await ctx.api.deleteMessage(ctx.chat!.id, msg.message_id);
    } catch {
      // ignore
    }
  } catch (error) {
    logger.error('Error in handleExportData:', error);
    await ctx.reply(i18n.t('errors.generic', ctx.user?.language ?? 'ru'));
  }
}
