import { InlineKeyboard } from 'grammy';
import { BotContext } from '../index';
import { updateUser, updateUserPreferences } from '../../database/queries/user';
import { getOrCreatePlanSubscription, setBonusModule } from '../../modules/premium';
import { i18n } from '../../localization';
import type { Language } from '../../localization';
import { logger } from '../../utils/logger';
import { bot } from '../index';
import { setUserCommands } from '../commands';

export async function handleStart(ctx: BotContext) {
  try {
    if (!ctx.user) {
      await ctx.reply('Ошибка авторизации. Попробуйте /start снова.');
      return;
    }

    // Сначала — согласие на обработку ПД
    if (!ctx.user.consentGivenAt) {
      logger.info(`Consent screen shown: ${ctx.user.telegramId}`);
      const keyboard = new InlineKeyboard()
        .text(i18n.t('consent.agree', ctx.user.language), 'consent:agree')
        .row()
        .text(i18n.t('consent.decline', ctx.user.language), 'consent:decline');
      await ctx.reply(i18n.t('consent.text', ctx.user.language), { reply_markup: keyboard, parse_mode: 'HTML' });
      return;
    }

    const isNewUser = !ctx.user.name;

    if (isNewUser) {
      // Новый пользователь — начинаем онбординг
      logger.info(`New user onboarding started: ${ctx.user.telegramId}`);

      await ctx.reply(i18n.t('onboarding.welcome_short', ctx.user.language));

      ctx.session.onboardingStep = 'language';
      ctx.session.onboardingData = {};
      await askLanguage(ctx);
    } else {
      // Вернувшийся пользователь
      logger.info(`Returning user: ${ctx.user.telegramId}`);

      const nameFallback: Record<string, string> = { ru: 'друг', en: 'friend', es: 'amigo', uz: "do'st", ar: 'صديق', tr: 'arkadaş' };
      const name = ctx.user.name || nameFallback[ctx.user.language] || 'friend';
      await ctx.reply(i18n.t('onboarding.welcome_back', ctx.user.language, { name }));
    }
  } catch (error) {
    logger.error('Error in handleStart:', error);
    await ctx.reply(i18n.t('errors.generic', ctx.user?.language ?? 'ru'));
  }
}

// Обработчик callback queries для онбординга
export async function handleOnboardingCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  
  if (!data || !ctx.user) return;
  
  const session = ctx.session;
  if (!session) return;

  try {
    // Парсим callback data
    const [action, value] = data.split(':');
    
    if (action === 'lang') {
      const lang = value as Language;
      session.onboardingData.language = value;
      await updateUser(ctx.user.telegramId, { language: value });
      ctx.user.language = lang;
      
      // Устанавливаем команды на языке пользователя
      if (ctx.from?.id) {
        await setUserCommands(bot, ctx.from.id, value);
      }
      
      // Переходим к вопросу об имени
      session.onboardingStep = 'name';
      await ctx.reply(i18n.t('onboarding.ask_name', value as Language));
    } else if (action === 'tone') {
      session.onboardingData.tone = value;
      session.onboardingStep = 'length';
      await askLength(ctx);
    } else if (action === 'length') {
      session.onboardingData.length = value;
      session.onboardingStep = 'emoji';
      await askEmoji(ctx);
    } else if (action === 'emoji') {
      session.onboardingData.emoji = value;
      session.onboardingStep = 'structure';
      await askStructure(ctx);
    } else if (action === 'structure') {
      session.onboardingData.structure = value;
      session.onboardingStep = 'style';
      await askStyle(ctx);
    } else if (action === 'style') {
      session.onboardingData.style = value;
      session.onboardingStep = 'detail';
      await askDetail(ctx);
    } else if (action === 'detail') {
      session.onboardingData.detail = value;
      session.onboardingStep = 'custom';
      await askCustom(ctx);
    } else if (action === 'done') {
      await finishOnboarding(ctx);
    } else if (action === 'bonus') {
      // V4: выбор бонусного модуля для Free
      if (ctx.user?.id) {
        await setBonusModule(ctx.user.id, value);
        ctx.session.onboardingStep = null;
        ctx.session.onboardingData = {};
        await ctx.reply(i18n.t('onboarding.completed', ctx.user.language));
      }
    }
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Error in handleOnboardingCallback:', error);
    await ctx.answerCallbackQuery('Ошибка');
  }
}

// Обработчик текстовых сообщений во время онбординга
export async function handleOnboardingMessage(ctx: BotContext) {
  const session = ctx.session;
  if (!session || !ctx.user) return false;
  
  const text = ctx.message?.text;
  if (!text) return false;
  
  try {
    if (session.onboardingStep === 'name') {
      // Сохраняем имя
      session.onboardingData.name = text;
      await updateUser(ctx.user.telegramId, { name: text });
      ctx.user.name = text;
      
      // Переходим к настройкам тона
      session.onboardingStep = 'tone';
      await askTone(ctx);
      return true;
    } else if (session.onboardingStep === 'custom') {
      session.onboardingData.customPrompt = text;
      await finishOnboarding(ctx);
      return true;
    } else if (session.onboardingStep === 'bonus_module') {
      await ctx.reply('Выбери бонусный модуль кнопкой выше');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error in handleOnboardingMessage:', error);
    return false;
  }
}

// Вспомогательные функции для вопросов

async function askLanguage(ctx: BotContext) {
  const keyboard = new InlineKeyboard()
    .text('🇷🇺 Русский', 'lang:ru')
    .text('🇬🇧 English', 'lang:en')
    .row()
    .text('🇪🇸 Español', 'lang:es')
    .text('🇺🇿 O\'zbek', 'lang:uz')
    .row()
    .text('🇸🇦 العربية', 'lang:ar')
    .text('🇹🇷 Türkçe', 'lang:tr');
  
  await ctx.reply(
    i18n.t('onboarding.ask_language', ctx.user!.language),
    { reply_markup: keyboard }
  );
}

async function askTone(ctx: BotContext) {
  const lang = ctx.user!.language;
  const keyboard = new InlineKeyboard()
    .text(i18n.t('preferences.tone_formal', lang), 'tone:formal')
    .row()
    .text(i18n.t('preferences.tone_friendly', lang), 'tone:friendly')
    .row()
    .text(i18n.t('preferences.tone_neutral', lang), 'tone:neutral');
  
  await ctx.reply(i18n.t('onboarding.ask_tone', lang), { reply_markup: keyboard });
}

async function askLength(ctx: BotContext) {
  const lang = ctx.user!.language;
  const keyboard = new InlineKeyboard()
    .text(i18n.t('preferences.length_brief', lang), 'length:brief')
    .row()
    .text(i18n.t('preferences.length_medium', lang), 'length:medium')
    .row()
    .text(i18n.t('preferences.length_detailed', lang), 'length:detailed');
  
  await ctx.reply(i18n.t('onboarding.ask_length', lang), { reply_markup: keyboard });
}

async function askEmoji(ctx: BotContext) {
  const lang = ctx.user!.language;
  const keyboard = new InlineKeyboard()
    .text(i18n.t('preferences.emoji_yes', lang), 'emoji:yes')
    .row()
    .text(i18n.t('preferences.emoji_no', lang), 'emoji:no')
    .row()
    .text(i18n.t('preferences.emoji_moderate', lang), 'emoji:moderate');
  
  await ctx.reply(i18n.t('onboarding.ask_emoji', lang), { reply_markup: keyboard });
}

async function askStructure(ctx: BotContext) {
  const lang = ctx.user!.language;
  const keyboard = new InlineKeyboard()
    .text(i18n.t('preferences.structure_lists', lang), 'structure:lists')
    .row()
    .text(i18n.t('preferences.structure_paragraphs', lang), 'structure:paragraphs')
    .row()
    .text(i18n.t('preferences.structure_mixed', lang), 'structure:mixed');
  
  await ctx.reply(i18n.t('onboarding.ask_structure', lang), { reply_markup: keyboard });
}

async function askStyle(ctx: BotContext) {
  const lang = ctx.user!.language;
  const keyboard = new InlineKeyboard()
    .text(i18n.t('preferences.style_expert', lang), 'style:expert')
    .row()
    .text(i18n.t('preferences.style_friend', lang), 'style:friend')
    .row()
    .text(i18n.t('preferences.style_teacher', lang), 'style:teacher');
  
  await ctx.reply(i18n.t('onboarding.ask_style', lang), { reply_markup: keyboard });
}

async function askDetail(ctx: BotContext) {
  const lang = ctx.user!.language;
  const keyboard = new InlineKeyboard()
    .text(i18n.t('preferences.detail_answer_only', lang), 'detail:answer_only')
    .row()
    .text(i18n.t('preferences.detail_with_context', lang), 'detail:with_context')
    .row()
    .text(i18n.t('preferences.detail_maximum', lang), 'detail:maximum');
  
  await ctx.reply(i18n.t('onboarding.ask_detail', lang), { reply_markup: keyboard });
}

async function askCustom(ctx: BotContext) {
  const lang = ctx.user!.language;
  const keyboard = new InlineKeyboard().text(i18n.t('buttons.done', lang), 'done');
  
  await ctx.reply(i18n.t('onboarding.ask_custom', lang), { reply_markup: keyboard });
}

async function finishOnboarding(ctx: BotContext) {
  const session = ctx.session;
  if (!ctx.user || !session) return;

  await updateUserPreferences(ctx.user.telegramId, {
    tone: session.onboardingData.tone,
    length: session.onboardingData.length,
    emoji: session.onboardingData.emoji,
    structure: session.onboardingData.structure,
    style: session.onboardingData.style,
    detail: session.onboardingData.detail,
    customPrompt: session.onboardingData.customPrompt,
  });

  const plan = await getOrCreatePlanSubscription(ctx.user.id);
  // Бонусный модуль выбирается только при первом онбординге; при редактировании — не показываем выбор
  if (plan.bonusModule) {
    ctx.session.onboardingStep = null;
    ctx.session.onboardingData = {};
    await ctx.reply(i18n.t('onboarding.completed', ctx.user.language));
  } else {
    ctx.session.onboardingStep = 'bonus_module';
    await askBonusModule(ctx);
  }
}

async function askBonusModule(ctx: BotContext) {
  const keyboard = new InlineKeyboard()
    .text('Напоминания', 'bonus:remind')
    .text('База знаний', 'bonus:kb')
    .row()
    .text('Привычки', 'bonus:habit')
    .text('Инвестиции', 'bonus:invest')
    .row()
    .text('Email AI', 'bonus:email')
    .text('Подписки', 'bonus:sub')
    .row()
    .text('Книги', 'bonus:book')
    .text('Новости', 'bonus:news');

  await ctx.reply(
    'Выбери один **бонусный модуль** (бесплатно). Остальные будут доступны в Pro.\n\n' +
      'Нажми на кнопку ниже:',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}
