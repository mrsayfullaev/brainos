/**
 * V4 Email Agent: загрузка inbox из Gmail через Gmail API
 */

import { getEmailAccount, setEmailAccount, saveThread } from './queries';
import { refreshGmailAccessToken, listMessages, getMessage } from './gmail-api';
import { logger } from '../../utils/logger';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

/**
 * Загружает последние письма из Gmail, обновляет access token при необходимости, сохраняет треды в БД.
 */
export async function fetchInbox(userId: string): Promise<{ ok: boolean; count: number }> {
  const acc = await getEmailAccount(userId);
  if (!acc) return { ok: false, count: 0 };
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    logger.warn('Gmail API: missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET');
    return { ok: false, count: 0 };
  }

  let accessToken = acc.accessToken;

  try {
    let list: { id: string; threadId: string }[];
    try {
      list = await listMessages(accessToken, 25);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg.includes('401') || msg.includes('invalid') || msg.includes('expired')) {
        const tokens = await refreshGmailAccessToken(
          acc.refreshToken,
          GMAIL_CLIENT_ID,
          GMAIL_CLIENT_SECRET
        );
        await setEmailAccount(userId, tokens.accessToken, tokens.refreshToken, acc.email);
        accessToken = tokens.accessToken;
        list = await listMessages(accessToken, 25);
      } else throw err;
    }
    if (list.length === 0) return { ok: true, count: 0 };

    let count = 0;
    const seenThreads = new Set<string>();
    for (const msg of list) {
      if (seenThreads.has(msg.threadId)) continue;
      seenThreads.add(msg.threadId);
      try {
        const detail = await getMessage(accessToken, msg.id);
        let receivedAt: Date | null = detail.date ? new Date(detail.date) : null;
        if (receivedAt && isNaN(receivedAt.getTime())) receivedAt = null;
        await saveThread(
          acc.id,
          detail.threadId,
          detail.subject || '(без темы)',
          detail.snippet || null,
          detail.from || null,
          receivedAt
        );
        count++;
      } catch (e) {
        logger.warn('Inbox: failed to get message', msg.id, e);
      }
    }

    return { ok: true, count };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    logger.error(`fetchInbox failed for ${userId}: ${errMsg}`);
    return { ok: false, count: 0 };
  }
}
