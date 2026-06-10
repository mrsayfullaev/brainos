/**
 * V4 Meeting Agent — cron: преподготовка за час до встречи
 */

import { logger } from '../../utils/logger';
import { systemLLMGenerate } from '../../ai/system-llm';
import { sendTelegramMessage } from '../../bot/sendMessage';
import { getUpcomingMeetingsNeedingPrep, setMeetingAgenda } from './queries';

/**
 * Генерирует краткую повестку для встречи и отправляет пользователю в Telegram
 */
export async function checkMeetingPrep() {
  try {
    const meetings = await getUpcomingMeetingsNeedingPrep();
    if (meetings.length === 0) return;

    logger.info(`Meeting prep: ${meetings.length} meeting(s) in 50–60 min`);

    for (const meeting of meetings) {
      try {
        const title = meeting.titleDecrypted || 'Встреча';
        const lang = meeting.user.language || 'ru';
        const langName = lang === 'ru' ? 'Russian' : lang === 'en' ? 'English' : 'Russian';

        const prompt = `Generate a SHORT meeting agenda (3–5 bullet points) for: "${title}".
Language: ${langName}.
Output ONLY the bullet list, no intro.`;

        const agenda = await systemLLMGenerate(prompt, { language: langName });
        await setMeetingAgenda(meeting.id, agenda);

        const message = `Встреча через час: **${title}**\n\nПовестка:\n${agenda}\n\nХочешь что-то добавить? Просто напиши.`;
        await sendTelegramMessage(meeting.user.telegramId, message, { parse_mode: 'Markdown' });
        logger.info(`Meeting prep sent for meeting ${meeting.id}`);
      } catch (err) {
        logger.error(`Meeting prep failed for ${meeting.id}:`, err);
      }
    }
  } catch (error) {
    logger.error('Error in checkMeetingPrep:', error);
  }
}
