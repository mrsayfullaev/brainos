import type { User } from '@prisma/client';
import { BotContext } from '../index';
import { i18n } from '../../localization';
import { getAccessibleModules, getOrCreatePlanSubscription, ALL_MODULES } from '../../modules/premium';
import { logger } from '../../utils/logger';

export async function handleHelp(ctx: BotContext) {
  try {
    if (!ctx.user) {
      await ctx.reply('Ошибка авторизации. Попробуйте /start.');
      return;
    }

    logger.info(`Help requested by user: ${ctx.user.telegramId}`);

    const lang = ctx.user.language;
    const accessibleModules = await getAccessibleModules(ctx.user as User);

    // Pro/Team — все модули; Free — персонализированный список с выделением бонусного
    const isProOrTeam = accessibleModules.length >= ALL_MODULES.length;

    let helpMessage: string;
    if (isProOrTeam) {
      helpMessage = i18n.t('help.message_pro', lang);
    } else {
      const plan = await getOrCreatePlanSubscription(ctx.user.id);
      const bonusModule = plan?.bonusModule ?? null;
      const bonusSuffix = i18n.t('help.bonus_suffix', lang);
      const modulesList = accessibleModules
        .map((m) => {
          const name = i18n.t(`help.modules.${m}`, lang);
          return m === bonusModule ? `${name}${bonusSuffix}` : name;
        })
        .join('\n• ');
      helpMessage = i18n.t('help.message_free', lang, { modules: modulesList });
    }

    await ctx.reply(helpMessage);
  } catch (error) {
    logger.error('Error in handleHelp:', error);
    await ctx.reply(i18n.t('errors.generic', ctx.user?.language ?? 'ru'));
  }
}
