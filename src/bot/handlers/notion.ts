/**
 * V4 Notion Integration: команда /notion — подключение, привязка баз, отключение
 */

import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../index';
import {
  getNotionConnection,
  disconnectNotion,
  getNotionLinkedDatabases,
  addNotionLinkedDatabase,
} from '../../modules/notion';
import { getNotionOAuthUrl, isNotionOAuthConfigured } from '../../modules/notion/oauth';

export async function handleNotion(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('Ошибка авторизации.');
    return;
  }

  const lang = ctx.user.language ?? 'ru';
  const conn = await getNotionConnection(ctx.user.id);

  if (conn) {
    const linkedTasks = await getNotionLinkedDatabases(ctx.user.id, 'TASKS');
    const linkedNotes = await getNotionLinkedDatabases(ctx.user.id, 'NOTES');
    const lastSync = conn.lastSyncAt
      ? new Date(conn.lastSyncAt).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en')
      : null;
    let text =
      lang === 'ru'
        ? '**Notion подключён.**\n\nСинхронизация по расписанию (ежедневно).'
        : '**Notion connected.**\n\nSync on schedule (daily).';
    if (linkedTasks.length > 0 || linkedNotes.length > 0) {
      text +=
        lang === 'ru'
          ? `\n\nПривязанные базы: задачи — ${linkedTasks.length}, заметки — ${linkedNotes.length}.`
          : `\n\nLinked DBs: tasks — ${linkedTasks.length}, notes — ${linkedNotes.length}.`;
    }
    text +=
      lang === 'ru'
        ? '\n\nПривязать базу: /notion_link tasks <id> или /notion_link notes <id>.'
        : '\n\nLink DB: /notion_link tasks <id> or /notion_link notes <id>.';
    if (lastSync) {
      text +=
        lang === 'ru'
          ? `\n\nПоследняя синхронизация: ${lastSync}`
          : `\n\nLast sync: ${lastSync}`;
    }
    const keyboard = new InlineKeyboard().text(
      lang === 'ru' ? 'Отключить Notion' : 'Disconnect Notion',
      'notion:disconnect'
    );
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    return;
  }

  if (!isNotionOAuthConfigured()) {
    await ctx.reply(
      lang === 'ru'
        ? 'Интеграция Notion пока не настроена на сервере.'
        : 'Notion integration is not configured yet.'
    );
    return;
  }

  const url = getNotionOAuthUrl(ctx.user.id);
  if (!url) {
    await ctx.reply('Не удалось сформировать ссылку.');
    return;
  }
  const keyboard = new InlineKeyboard().url(
    lang === 'ru' ? 'Подключить Notion' : 'Connect Notion',
    url
  );
  await ctx.reply(
    lang === 'ru'
      ? 'Синхронизация задач и заметок с Notion. Нажмите кнопку и авторизуйтесь в Notion.'
      : 'Sync tasks and notes with Notion. Click the button and authorize in Notion.',
    { reply_markup: keyboard }
  );
}

/** Команда /notion_link <tasks|notes> <database_id> — привязать базу Notion. */
export async function handleNotionLink(ctx: BotContext) {
  if (!ctx.user) {
    await ctx.reply('Ошибка авторизации.');
    return;
  }
  const conn = await getNotionConnection(ctx.user.id);
  if (!conn) {
    await ctx.reply(
      ctx.user.language === 'ru'
        ? 'Сначала подключите Notion: /notion'
        : 'Connect Notion first: /notion'
    );
    return;
  }
  const raw = ctx.message?.text?.replace(/^\/notion_link\s*/i, '').trim() ?? '';
  const [type, databaseId] = raw.split(/\s+/, 2);
  if (!type || !databaseId) {
    await ctx.reply(
      ctx.user.language === 'ru'
        ? 'Использование: /notion_link tasks <id> или /notion_link notes <id>. ID — из ссылки на базу в Notion.'
        : 'Usage: /notion_link tasks <id> or /notion_link notes <id>. ID from Notion DB URL.'
    );
    return;
  }
  const t = type.toLowerCase();
  if (t !== 'tasks' && t !== 'notes') {
    await ctx.reply(ctx.user.language === 'ru' ? 'Тип: tasks или notes.' : 'Type: tasks or notes.');
    return;
  }
  try {
    await addNotionLinkedDatabase(ctx.user.id, t === 'tasks' ? 'TASKS' : 'NOTES', databaseId);
    await ctx.reply(
      ctx.user.language === 'ru'
        ? `База привязана (${t === 'tasks' ? 'задачи' : 'заметки'}).`
        : `Database linked (${t}).`
    );
  } catch (e) {
    await ctx.reply(
      ctx.user.language === 'ru' ? 'Ошибка при привязке базы.' : 'Failed to link database.'
    );
  }
}

export async function handleNotionCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (data !== 'notion:disconnect' || !ctx.user) return;
  await ctx.answerCallbackQuery({ text: '…' });
  await disconnectNotion(ctx.user.id);
  const lang = ctx.user.language ?? 'ru';
  await ctx.reply(
    lang === 'ru' ? 'Notion отключён.' : 'Notion disconnected.'
  );
}
