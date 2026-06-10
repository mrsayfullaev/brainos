/**
 * Проверка подписи Telegram Login Widget (https://core.telegram.org/widgets/login)
 * data_check_string = ключи (кроме hash) в алфавитном порядке, key=value через \n
 * secret_key = SHA256(bot_token), hash = HMAC_SHA256(data_check_string, secret_key) в hex
 */

import { createHmac, createHash } from 'crypto';

export interface TelegramAuthPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

/**
 * Проверяет, что payload подписан нашим ботом. auth_date не старше 24 ч (опционально).
 */
export function verifyTelegramLogin(
  payload: Record<string, string>,
  botToken: string,
  maxAgeSeconds = 86400
): boolean {
  const hash = payload.hash;
  if (!hash) return false;

  const authDate = parseInt(payload.auth_date, 10);
  if (Number.isNaN(authDate) || (maxAgeSeconds > 0 && Date.now() / 1000 - authDate > maxAgeSeconds)) {
    return false;
  }

  const dataCheckString = Object.keys(payload)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return computedHash === hash;
}
