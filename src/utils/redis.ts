/**
 * Redis клиент (опционально). Используется для OAuth state, кэша, очередей.
 * Если REDIS_URL не задан — функции no-op / возвращают null.
 */

import Redis from 'ioredis';
import { logger } from './logger';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    client = new Redis(url, { maxRetriesPerRequest: 3 });
    client.on('error', (err) => logger.warn('Redis error', err));
    return client;
  } catch (e) {
    logger.warn('Redis init failed', e);
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return Boolean(process.env.REDIS_URL);
}

/** Кэш с TTL (секунды). Без Redis — возвращает null при get, ничего не делает при set. */
export async function cacheGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.setex(key, ttlSeconds, value);
  } catch (e) {
    logger.warn('Redis setex failed', e);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key);
  } catch {
    // ignore
  }
}

/** Сохранить OAuth state (stateId -> userId), TTL 10 мин */
const OAUTH_STATE_PREFIX = 'oauth:state:';
const OAUTH_STATE_TTL = 600;

export async function setOAuthState(stateId: string, userId: string): Promise<void> {
  await cacheSet(OAUTH_STATE_PREFIX + stateId, userId, OAUTH_STATE_TTL);
}

export async function getAndDeleteOAuthState(stateId: string): Promise<string | null> {
  const key = OAUTH_STATE_PREFIX + stateId;
  const val = await cacheGet(key);
  await cacheDel(key);
  return val;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
