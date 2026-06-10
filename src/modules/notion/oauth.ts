/**
 * V4 Notion Integration: OAuth 2.0 URL и обмен code на token
 * Требует NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI (или BASE_URL + /auth/notion/callback)
 */

import { randomBytes } from 'crypto';
import { setNotionConnection } from './queries';
import { setOAuthState, getAndDeleteOAuthState, isRedisAvailable } from '../../utils/redis';
import { logger } from '../../utils/logger';

const NOTION_AUTH_URL = 'https://api.notion.com/v1/oauth/authorize';
const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

export function isNotionOAuthConfigured(): boolean {
  return Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET);
}

/**
 * Возвращает URL для редиректа пользователя на авторизацию Notion.
 * state = userId (передаётся в callback для привязки токена)
 */
export function getNotionOAuthUrl(userId: string): string | null {
  if (!isNotionOAuthConfigured()) return null;
  const clientId = process.env.NOTION_CLIENT_ID!;
  const redirectUri = process.env.NOTION_REDIRECT_URI ?? `${process.env.BASE_URL ?? 'http://localhost:3333'}/auth/notion/callback`;
  const state = isRedisAvailable()
    ? randomBytes(16).toString('hex')
    : encodeURIComponent(userId);
  if (isRedisAvailable()) setOAuthState(state, userId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    owner: 'user',
    state,
  });
  return `${NOTION_AUTH_URL}?${params.toString()}`;
}

/**
 * Обменивает code на access_token и сохраняет подключение для userId из state
 */
export async function handleNotionOAuthCallback(code: string, state: string): Promise<{ ok: boolean; error?: string }> {
  if (!isNotionOAuthConfigured()) {
    return { ok: false, error: 'Notion OAuth not configured' };
  }
  const clientId = process.env.NOTION_CLIENT_ID!;
  const clientSecret = process.env.NOTION_CLIENT_SECRET!;
  const redirectUri = process.env.NOTION_REDIRECT_URI ?? `${process.env.BASE_URL ?? 'http://localhost:3333'}/auth/notion/callback`;
  let userId: string;
  if (isRedisAvailable()) {
    const fromRedis = await getAndDeleteOAuthState(state);
    if (!fromRedis) return { ok: false, error: 'Invalid or expired state' };
    userId = fromRedis;
  } else {
    userId = decodeURIComponent(state);
    if (!userId) return { ok: false, error: 'Invalid state' };
  }

  try {
    const res = await fetch(NOTION_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.warn('Notion token exchange failed', res.status, err);
      return { ok: false, error: `Notion API: ${res.status}` };
    }

    const data = (await res.json()) as { access_token?: string; workspace_id?: string };
    const accessToken = data.access_token;
    if (!accessToken) {
      return { ok: false, error: 'No access_token in response' };
    }

    await setNotionConnection(userId, accessToken, data.workspace_id ?? null);
    logger.info('Notion connected for user', userId);
    return { ok: true };
  } catch (e) {
    logger.error('Notion OAuth callback error', e);
    return { ok: false, error: (e as Error).message };
  }
}
