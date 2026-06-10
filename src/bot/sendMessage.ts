/**
 * Отправка сообщений в Telegram из cron и фоновых задач
 */

import { bot } from './index';

export type SendMessageOptions = {
  parse_mode?: 'Markdown' | 'HTML';
  disable_web_page_preview?: boolean;
};

/**
 * Отправляет сообщение пользователю по telegramId (для использования в cron, без ctx)
 */
export async function sendTelegramMessage(
  telegramId: bigint,
  text: string,
  options?: SendMessageOptions
): Promise<void> {
  await bot.api.sendMessage(Number(telegramId), text, options);
}
