/**
 * Email Module - AI draft generation (V3)
 */

import type { User } from '@prisma/client';
import { raceAIProviders } from '../../ai/race';
import { buildSystemPrompt } from '../systemPrompt';
import type { EmailTemplate, EmailTone } from './types';

const TEMPLATE_GUIDES: Record<EmailTemplate, string> = {
  RESIGNATION: 'Follow standard resignation letter format: notice period, gratitude, transition offer.',
  COMPLAINT: 'Be assertive but professional. State the issue, desired resolution, deadline.',
  INVITATION: 'Include event details: date, time, location, RSVP instructions.',
  THANK_YOU: 'Express genuine gratitude, be specific about what you\'re thankful for.',
  APOLOGY: 'Acknowledge mistake, take responsibility, offer solution.',
  FOLLOW_UP: 'Reference previous interaction, politely request update or action.',
  INTRODUCTION: 'Introduce yourself briefly, state reason for contact, call to action.',
  CUSTOM: '',
};

export async function generateEmailDraft(
  user: User,
  input: {
    purpose: string;
    recipient?: string;
    tone: EmailTone;
    template?: EmailTemplate;
    additionalContext?: string;
  }
): Promise<{ subject: string; body: string }> {
  const base = buildSystemPrompt(user);
  const templateGuide = input.template ? TEMPLATE_GUIDES[input.template] : '';

  const prompt = `
${base}

TASK: Generate a professional email draft.

Purpose: ${input.purpose}
${input.recipient ? `Recipient: ${input.recipient}` : ''}
Tone: ${input.tone}
${templateGuide}
${input.additionalContext ? `Additional context: ${input.additionalContext}` : ''}

Language: ${user.language}

Respond with exactly:
SUBJECT: [one line]
BODY:
[email body]
  `.trim();

  const result = await raceAIProviders(prompt, input.purpose);
  const text = result.winner.response;
  const subjectMatch = text.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);

  return {
    subject: subjectMatch ? subjectMatch[1].trim() : 'Email Draft',
    body: bodyMatch ? bodyMatch[1].trim() : text,
  };
}
