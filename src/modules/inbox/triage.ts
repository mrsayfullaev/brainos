/**
 * V4 Email Agent: триаж писем через systemLLMGenerate (срочно/важно/спам)
 */

import { systemLLMGenerate } from '../../ai/system-llm';
import { getThreads, updateTriageBulk } from './queries';
import type { EmailTriage } from '@prisma/client';
import { logger } from '../../utils/logger';

const TRIAGE_MAP: Record<string, EmailTriage> = {
  URGENT: 'URGENT',
  IMPORTANT: 'IMPORTANT',
  NORMAL: 'NORMAL',
  SPAM: 'SPAM',
  PENDING: 'PENDING',
};

export interface ThreadForTriage {
  externalId: string;
  subject: string;
  snippet: string | null;
  fromAddress: string | null;
}

/**
 * Классифицирует список писем (subject + snippet) и возвращает маппинг externalId -> triage
 */
export async function triageThreads(
  threads: ThreadForTriage[],
  language: string
): Promise<Array<{ externalId: string; triage: EmailTriage }>> {
  if (threads.length === 0) return [];

  const list = threads
    .map(
      (t, i) =>
        `[${i}] subject: ${t.subject}; from: ${t.fromAddress ?? '?'}; snippet: ${(t.snippet ?? '').slice(0, 100)}`
    )
    .join('\n');

  const prompt = `Classify each email thread by priority. Reply ONLY with a JSON array, one object per line index:
[{"index": 0, "triage": "URGENT"|"IMPORTANT"|"NORMAL"|"SPAM"}, ...]

Use URGENT for time-sensitive or critical; IMPORTANT for need reply soon; NORMAL for rest; SPAM for junk.
Emails list:
${list}

JSON array:`;

  try {
    const raw = await systemLLMGenerate(prompt, { language });
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const arr = JSON.parse(cleaned) as Array<{ index: number; triage: string }>;
    const result: Array<{ externalId: string; triage: EmailTriage }> = [];
    for (const item of arr) {
      const thread = threads[item.index];
      if (!thread) continue;
      const triage = TRIAGE_MAP[String(item.triage).toUpperCase()] ?? 'NORMAL';
      result.push({ externalId: thread.externalId, triage });
    }
    return result;
  } catch (e) {
    logger.error('Triage LLM failed', e);
    return threads.map((t) => ({ externalId: t.externalId, triage: 'PENDING' as EmailTriage }));
  }
}

/**
 * Триаж для сохранённых тредов пользователя и запись в БД
 */
export async function runTriageForAccount(
  emailAccountId: string,
  userId: string,
  language: string
): Promise<number> {
  const data = await getThreads(userId, 'PENDING', 30);
  if (!data || data.threads.length === 0) return 0;
  const forTriage: ThreadForTriage[] = data.threads.map((t) => ({
    externalId: t.externalId,
    subject: t.subject,
    snippet: t.snippet,
    fromAddress: t.fromAddress,
  }));
  const updates = await triageThreads(forTriage, language);
  await updateTriageBulk(emailAccountId, updates);
  return updates.length;
}
