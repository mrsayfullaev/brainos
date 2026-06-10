/**
 * Email Module - Handlers (V3)
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { generateEmailDraft } from './generator';
import { createEmailDraft } from './queries';
import type { EmailTemplate, EmailTone } from './types';

export async function handleEmailMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const trimmed = message.replace(/^@email\s*/i, '').trim();

  let tone: EmailTone = 'FORMAL';
  if (/дружелюбн|friendly|casual/i.test(trimmed)) tone = 'FRIENDLY';
  else if (/неформаль|casual/i.test(trimmed)) tone = 'CASUAL';
  else if (/уверен|assertive/i.test(trimmed)) tone = 'ASSERTIVE';

  let template: EmailTemplate | undefined;
  if (/увольнен|resignation/i.test(trimmed)) template = 'RESIGNATION';
  else if (/жалоб|complaint/i.test(trimmed)) template = 'COMPLAINT';
  else if (/приглашен|invitation/i.test(trimmed)) template = 'INVITATION';
  else if (/благодар|thank/i.test(trimmed)) template = 'THANK_YOU';
  else if (/извинен|apology/i.test(trimmed)) template = 'APOLOGY';
  else if (/напомин|follow.?up/i.test(trimmed)) template = 'FOLLOW_UP';
  else if (/знакомств|introduction/i.test(trimmed)) template = 'INTRODUCTION';

  const { subject, body } = await generateEmailDraft(user, {
    purpose: trimmed,
    tone,
    template,
  });

  await createEmailDraft({
    userId: user.id,
    subject,
    body,
    tone,
    template,
  });

  const modulePrompt = `
=== EMAIL DRAFT CREATED ===
Subject: ${subject}
Body (first 200 chars): ${body.slice(0, 200)}...

Tell the user the draft is ready in ${user.language}. They can copy it from the next message or ask to regenerate.
  `.trim();

  return {
    modulePrompt,
    data: { subject, body },
    directResponse: `**${subject}**\n\n${body}`,
    skipAI: true,
  };
}
