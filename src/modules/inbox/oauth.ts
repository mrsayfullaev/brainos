/**
 * V4 Email Agent: Gmail OAuth 2.0
 * Требует GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI или BASE_URL
 */

import { randomBytes } from 'crypto';
import { setEmailAccount } from './queries';
import { setOAuthState, getAndDeleteOAuthState, isRedisAvailable } from '../../utils/redis';
import { logger } from '../../utils/logger';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export function isGmailOAuthConfigured(): boolean {
  return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
}

export function getGmailOAuthUrl(userId: string): string | null {
  if (!isGmailOAuthConfigured()) return null;
  const clientId = process.env.GMAIL_CLIENT_ID!;
  const redirectUri =
    process.env.GMAIL_REDIRECT_URI ??
    `${process.env.BASE_URL ?? 'http://localhost:3333'}/auth/gmail/callback`;
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

export async function handleGmailOAuthCallback(
  code: string,
  state: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isGmailOAuthConfigured()) {
    return { ok: false, error: 'Gmail OAuth not configured' };
  }
  const clientId = process.env.GMAIL_CLIENT_ID!;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET!;
  const redirectUri =
    process.env.GMAIL_REDIRECT_URI ??
    `${process.env.BASE_URL ?? 'http://localhost:3333'}/auth/gmail/callback`;
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
      logger.warn('Gmail token exchange failed', tokenRes.status, err);
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

    let email: string | null = null;
    try {
      const userRes = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData = (await userRes.json()) as { email?: string };
        email = userData.email ?? null;
      }
    } catch {
      // optional
    }

    await setEmailAccount(userId, accessToken, refreshToken, email);
    logger.info('Gmail connected for user', userId);
    return { ok: true };
  } catch (e) {
    logger.error('Gmail OAuth callback error', e);
    return { ok: false, error: (e as Error).message };
  }
}
