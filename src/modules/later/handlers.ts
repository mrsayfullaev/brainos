/**
 * Read Later Module - Handlers (V3)
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { extractMetadata } from './metadata';
import { createReadLater, getReadLaterList } from './queries';
import { logger } from '../../utils/logger';

const URL_REGEX = /https?:\/\/[^\s]+/;

export async function handleLaterMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const trimmed = message.replace(/^@later\s*/i, '').trim();

  try {
    const urlMatch = trimmed.match(URL_REGEX);
    const url = urlMatch ? urlMatch[0] : '';

    if (url) {
      const metadata = await extractMetadata(url);
      await createReadLater({
        userId: user.id,
        url,
        title: metadata.title,
        description: metadata.description,
        imageUrl: metadata.imageUrl,
        type: metadata.type,
        tags: (trimmed.match(/#\w+/g) || []).map((t) => t.slice(1)),
      });
      const unread = await getReadLaterList(user.id, { read: false });
      const modulePrompt = `
=== READ LATER - SAVED ===
Saved: ${metadata.title}
Type: ${metadata.type}
Unread list: ${unread.length} items

Confirm briefly in ${user.language}. Suggest "покажи список" to see the list.
      `.trim();
      logger.info('Read Later: item saved');
      return { modulePrompt };
    }

    if (/покажи|список|list|несмотрен|unread/i.test(trimmed)) {
      const unread = await getReadLaterList(user.id, { read: false, limit: 15 });
      const list =
        unread.length > 0
          ? unread.map((i, n) => `${n + 1}. ${i.title || i.url} ${i.read ? '✓' : ''}`).join('\n')
          : 'Нет сохранённых ссылок.';
      const modulePrompt = `
=== READ LATER LIST ===
Unread (${unread.length}):\n${list}

Present in ${user.language}. Keep it short.
      `.trim();
      return { modulePrompt, data: { items: unread } };
    }

    return {
      modulePrompt: `User wrote something without a URL. Reply in ${user.language}: send a link to save to "read later", or say "покажи список".`,
    };
  } catch (error) {
    logger.error('Error in Read Later handler:', error);
    return { modulePrompt: `Error. Reply in ${user.language}.` };
  }
}
