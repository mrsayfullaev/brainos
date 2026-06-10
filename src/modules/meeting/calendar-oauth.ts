/**
 * V4 Meeting Agent — Google Calendar OAuth 2.0
 * Требует CALENDAR_CLIENT_ID, CALENDAR_CLIENT_SECRET, CALENDAR_REDIRECT_URI или BASE_URL
 */

import { randomBytes } from 'crypto';
import { setCalendarConnection } from './queries';
import { setOAuthState, getAndDeleteOAuthState, isRedisAvailable } from '../../utils/redis';
import { logger } from '../../utils/logger';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events.readonly'].join(' ');

export function isCalendarOAuthConfigured(): boolean {
  return Boolean(process.env.CALENDAR_CLIENT_ID && process.env.CALENDAR_CLIENT_SECRET);
}

export function getCalendarOAuthUrl(userId: string): string | null {
  if (!isCalendarOAuthConfigured()) return null;
  const clientId = process.env.CALENDAR_CLIENT_ID!;
  const redirectUri =
    process.env.CALENDAR_REDIRECT_URI ??
    `${process.env.BASE_URL ?? 'http://localhost:3333'}/auth/calendar/callback`;
  const state = isRedisAvailable() ? randomBytes(16).toString('hex') : encodeURIComponent(userId);
  if (isRedisAvailable()) setOAuthState(state, userId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function handleCalendarOAuthCallback(
  code: string,
  state: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isCalendarOAuthConfigured()) {
    return { ok: false, error: 'Calendar OAuth not configured' };
  }
  const clientId = process.env.CALENDAR_CLIENT_ID!;
  const clientSecret = process.env.CALENDAR_CLIENT_SECRET!;
  const redirectUri =
    process.env.CALENDAR_REDIRECT_URI ??
    `${process.env.BASE_URL ?? 'http://localhost:3333'}/auth/calendar/callback`;
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
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      logger.warn('Calendar token exchange failed', tokenRes.status, err);
      return { ok: false, error: `Google API: ${tokenRes.status}` };
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    if (!accessToken || !refreshToken) {
      return { ok: false, error: 'No access_token or refresh_token' };
    }

    await setCalendarConnection(userId, accessToken, refreshToken);
    logger.info('Google Calendar connected for user', userId);
    return { ok: true };
  } catch (e) {
    logger.error('Calendar OAuth callback error', e);
    return { ok: false, error: (e as Error).message };
  }
}
