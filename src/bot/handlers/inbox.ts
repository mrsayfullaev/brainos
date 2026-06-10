/**
 * V4 Email Agent: команда /inbox — подключение Gmail и просмотр триажа
 */

import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../index';
import { getEmailAccount, getThreads, disconnectEmail } from '../../modules/inbox';
import { getGmailOAuthUrl, isGmailOAuthConfigured } from '../../modules/inbox/oauth';

const TRIAGE_LABELS: Record<string, string> = {
  URGENT: '',
  IMPORTANT: '',
  NORMAL: '',
  SPAM: '',
  PENDING: '',
};

export async function handleInbox(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('Ошибка авторизации.');
    return;
  }

  const lang = ctx.user.language ?? 'ru';
  const acc = await getEmailAccount(ctx.user.id);

  if (acc) {
    const threads = await getThreads(ctx.user.id, undefined, 10);
    let text =
      lang === 'ru'
        ? `**Inbox** (${acc.email ?? 'Gmail'})\n\nТредов: ${acc.threadCount ?? 0}\n\n`
        : `**Inbox** (${acc.email ?? 'Gmail'})\n\nThreads: ${acc.threadCount ?? 0}\n\n`;
    if (threads?.threads.length) {
      for (const t of threads.threads.slice(0, 5)) {
        const icon = TRIAGE_LABELS[t.triage] ?? '';
        text += `${icon} ${t.subject.slice(0, 40)}${t.subject.length > 40 ? '…' : ''}\n`;
      }
    } else {
      text += lang === 'ru' ? 'Нет писем или синхронизация не выполнялась.' : 'No emails or sync not run yet.';
    }
    const keyboard = new InlineKeyboard().text(
      lang === 'ru' ? 'Отключить Gmail' : 'Disconnect Gmail',
      'inbox:disconnect'
    );
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    return;
  }

  if (!isGmailOAuthConfigured()) {
    await ctx.reply(
      lang === 'ru' ? 'Интеграция Gmail пока не настроена на сервере.' : 'Gmail integration is not configured yet.'
    );
    return;
  }

  const url = getGmailOAuthUrl(ctx.user.id);
  if (!url) {
    await ctx.reply('Не удалось сформировать ссылку.');
    return;
  }
  const keyboard = new InlineKeyboard().url(
    lang === 'ru' ? 'Подключить Gmail' : 'Connect Gmail',
    url
  );
  await ctx.reply(
    lang === 'ru'
      ? 'Чтение inbox и триаж (срочно/важно/спам). Нажмите кнопку и авторизуйтесь в Google.'
      : 'Read inbox and triage (urgent/important/spam). Click and authorize with Google.',
    { reply_markup: keyboard }
  );
}

export async function handleInboxCallback(ctx: BotContext) {
  if (ctx.callbackQuery?.data !== 'inbox:disconnect' || !ctx.user) return;
  await ctx.answerCallbackQuery({ text: '…' });
  await disconnectEmail(ctx.user.id);
  const lang = ctx.user.language ?? 'ru';
  await ctx.reply(lang === 'ru' ? 'Gmail отключён.' : 'Gmail disconnected.');
}
