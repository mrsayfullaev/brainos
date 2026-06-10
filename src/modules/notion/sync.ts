/**
 * V4 Notion Integration: синхронизация задач и заметок ↔ Notion по привязанным базам (у каждого пользователя свои).
 */

import { getNotionConnection, updateLastSync, getAllNotionUserIds, getNotionLinkedDatabases } from './queries';
import { notionCreatePage, notionQueryDatabase, getTitleFromProps, getSelectFromProps } from './notion-api';
import { getTasks } from '../task/queries';
import { createTask } from '../task/queries';
import { getNotes } from '../note/queries';
import { createNote } from '../note/queries';
import { logger } from '../../utils/logger';

/**
 * Синхронизация задач пользователя в Notion (BrainOS → Notion) по всем привязанным базам типа TASKS.
 */
export async function syncTasksToNotion(userId: string): Promise<{ ok: boolean; count?: number }> {
  const conn = await getNotionConnection(userId);
  if (!conn) return { ok: false };
  const dbs = await getNotionLinkedDatabases(userId, 'TASKS');
  if (dbs.length === 0) return { ok: true, count: 0 };
  const tasks = await getTasks(userId, { limit: 50 });
  let count = 0;
  for (const db of dbs) {
    for (const task of tasks) {
      try {
        await notionCreatePage(conn.accessToken, db.databaseId, {
          Name: { title: [{ text: { content: task.title.slice(0, 2000) } }] },
          ...(task.status && { Status: { select: { name: task.status } } }),
        });
        count++;
      } catch (e) {
        logger.warn('Notion syncTasksToNotion page create failed', task.id, db.databaseId, e);
      }
    }
  }
  await updateLastSync(userId);
  return { ok: true, count };
}

/**
 * Синхронизация заметок пользователя в Notion (BrainOS → Notion) по всем привязанным базам типа NOTES.
 * В Notion создаётся страница с Name = содержимое заметки (обрезано до 2000 символов).
 */
export async function syncNotesToNotion(userId: string): Promise<{ ok: boolean; count?: number }> {
  const conn = await getNotionConnection(userId);
  if (!conn) return { ok: false };
  const dbs = await getNotionLinkedDatabases(userId, 'NOTES');
  if (dbs.length === 0) return { ok: true, count: 0 };
  const notes = await getNotes(userId, 50);
  let count = 0;
  for (const db of dbs) {
    for (const note of notes) {
      try {
        const content = (note.content || '').slice(0, 2000);
        if (!content.trim()) continue;
        await notionCreatePage(conn.accessToken, db.databaseId, {
          Name: { title: [{ text: { content } }] },
        });
        count++;
      } catch (e) {
        logger.warn('Notion syncNotesToNotion page create failed', note.id, db.databaseId, e);
      }
    }
  }
  await updateLastSync(userId);
  return { ok: true, count };
}

/**
 * Синхронизация из Notion в BrainOS (Notion → задачи) по всем привязанным базам TASKS.
 */
export async function syncTasksFromNotion(userId: string): Promise<{ ok: boolean; count?: number }> {
  const conn = await getNotionConnection(userId);
  if (!conn) return { ok: false };
  const dbs = await getNotionLinkedDatabases(userId, 'TASKS');
  let count = 0;
  for (const db of dbs) {
    try {
      const pages = await notionQueryDatabase(conn.accessToken, db.databaseId, 50);
      for (const page of pages) {
        const title = getTitleFromProps(page.properties);
        if (!title) continue;
        const statusRaw = getSelectFromProps(page.properties, 'Status');
        const status = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'].includes(statusRaw)
          ? (statusRaw as 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED')
          : 'TODO';
        try {
          await createTask({ userId, title, status });
          count++;
        } catch (e) {
          logger.warn('Notion syncTasksFromNotion createTask failed', page.id, e);
        }
      }
    } catch (e) {
      logger.error('Notion syncTasksFromNotion query failed', userId, db.databaseId, e);
    }
  }
  await updateLastSync(userId);
  return { ok: true, count };
}

/**
 * Синхронизация из Notion в BrainOS (Notion → заметки) по всем привязанным базам NOTES.
 * Свойство Name (или Title) страницы маппится в content заметки.
 */
export async function syncNotesFromNotion(userId: string): Promise<{ ok: boolean; count?: number }> {
  const conn = await getNotionConnection(userId);
  if (!conn) return { ok: false };
  const dbs = await getNotionLinkedDatabases(userId, 'NOTES');
  let count = 0;
  for (const db of dbs) {
    try {
      const pages = await notionQueryDatabase(conn.accessToken, db.databaseId, 50);
      for (const page of pages) {
        const content = getTitleFromProps(page.properties);
        if (!content.trim()) continue;
        try {
          await createNote({ userId, content });
          count++;
        } catch (e) {
          logger.warn('Notion syncNotesFromNotion createNote failed', page.id, e);
        }
      }
    } catch (e) {
      logger.error('Notion syncNotesFromNotion query failed', userId, db.databaseId, e);
    }
  }
  await updateLastSync(userId);
  return { ok: true, count };
}

/**
 * Синхронизация из Notion в BrainOS (задачи + заметки). Обёртка для обратной совместимости.
 */
export async function syncFromNotion(userId: string): Promise<{ ok: boolean; count?: number }> {
  const t = await syncTasksFromNotion(userId);
  const n = await syncNotesFromNotion(userId);
  return { ok: t.ok && n.ok, count: (t.count ?? 0) + (n.count ?? 0) };
}

/**
 * Двусторонняя синхронизация для одного пользователя (по его привязанным базам).
 */
export async function runSyncForUser(userId: string): Promise<void> {
  try {
    await syncTasksFromNotion(userId);
    await syncTasksToNotion(userId);
    await syncNotesFromNotion(userId);
    await syncNotesToNotion(userId);
  } catch (e) {
    logger.error('Notion sync failed for user', userId, e);
  }
}

/**
 * Cron: синхронизация для всех пользователей с подключённым Notion.
 */
export async function runNotionSyncCron(): Promise<void> {
  const userIds = await getAllNotionUserIds();
  for (const userId of userIds) {
    await runSyncForUser(userId);
  }
}
