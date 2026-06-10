/**
 * Email Module - Queries (V3)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { EmailTemplate, EmailTone } from './types';

export async function createEmailDraft(params: {
  userId: string;
  subject: string;
  body: string;
  recipient?: string;
  template?: EmailTemplate;
  tone?: EmailTone;
}) {
  const encSubject = encrypt(params.subject);
  const encBody = encrypt(params.body);
  if (!encSubject || !encBody) throw new Error('Encryption failed');

  return prisma.emailDraft.create({
    data: {
      userId: params.userId,
      subject: encSubject,
      body: encBody,
      recipient: params.recipient ? encrypt(params.recipient) : null,
      template: params.template,
      tone: params.tone || 'FORMAL',
    },
  });
}

export async function getEmailDrafts(userId: string, limit = 20) {
  const drafts = await prisma.emailDraft.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return drafts.map((d) => ({
    ...d,
    subject: decrypt(d.subject) || '',
    body: decrypt(d.body) || '',
    recipient: d.recipient ? decrypt(d.recipient) : null,
  }));
}
