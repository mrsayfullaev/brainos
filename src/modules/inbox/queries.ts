/**
 * V4 Email Agent: подключение Gmail (EmailAccount, EmailThread)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { EmailTriage } from '@prisma/client';

export async function getEmailAccount(userId: string) {
  const acc = await prisma.emailAccount.findUnique({
    where: { userId },
    include: { _count: { select: { threads: true } } },
  });
  if (!acc) return null;
  const accessToken = decrypt(acc.accessToken);
  const refreshToken = decrypt(acc.refreshToken);
  if (!accessToken || !refreshToken) return null;
  return {
    ...acc,
    accessToken,
    refreshToken,
    threadCount: acc._count.threads,
  };
}

export async function setEmailAccount(
  userId: string,
  accessToken: string,
  refreshToken: string,
  email?: string | null
) {
  const encAccess = encrypt(accessToken);
  const encRefresh = encrypt(refreshToken);
  if (!encAccess || !encRefresh) throw new Error('Encryption failed');
  return prisma.emailAccount.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: encAccess,
      refreshToken: encRefresh,
      email: email ?? undefined,
    },
    update: {
      accessToken: encAccess,
      refreshToken: encRefresh,
      email: email ?? undefined,
    },
  });
}

export async function disconnectEmail(userId: string) {
  await prisma.emailAccount.deleteMany({ where: { userId } });
}

export async function getThreads(userId: string, triage?: EmailTriage, limit = 20) {
  const acc = await prisma.emailAccount.findUnique({
    where: { userId },
    include: {
      threads: {
        where: triage ? { triage } : undefined,
        orderBy: { receivedAt: 'desc' },
        take: limit,
      },
    },
  });
  if (!acc) return null;
  const threads = acc.threads.map((t) => ({
    ...t,
    subject: decrypt(t.subject) ?? '',
    snippet: t.snippet ? decrypt(t.snippet) : null,
    fromAddress: t.fromAddress ? decrypt(t.fromAddress) : null,
  }));
  return { ...acc, threads };
}

export async function saveThread(
  emailAccountId: string,
  externalId: string,
  subject: string,
  snippet: string | null,
  fromAddress: string | null,
  receivedAt: Date | null
) {
  const encSubject = encrypt(subject);
  const encSnippet = snippet ? encrypt(snippet) : null;
  const encFrom = fromAddress ? encrypt(fromAddress) : null;
  if (!encSubject) return null;
  return prisma.emailThread.upsert({
    where: {
      emailAccountId_externalId: { emailAccountId, externalId },
    },
    create: {
      emailAccountId,
      externalId,
      subject: encSubject,
      snippet: encSnippet,
      fromAddress: encFrom,
      receivedAt,
    },
    update: {
      subject: encSubject,
      snippet: encSnippet,
      fromAddress: encFrom,
      receivedAt,
    },
  });
}

export async function updateThreadTriage(
  emailAccountId: string,
  externalId: string,
  triage: EmailTriage
) {
  return prisma.emailThread.updateMany({
    where: { emailAccountId, externalId },
    data: { triage },
  });
}

export async function updateTriageBulk(
  emailAccountId: string,
  updates: Array<{ externalId: string; triage: EmailTriage }>
) {
  for (const u of updates) {
    await updateThreadTriage(emailAccountId, u.externalId, u.triage);
  }
}

export async function getAllEmailAccountUserIds(): Promise<string[]> {
  const list = await prisma.emailAccount.findMany({ select: { userId: true } });
  return list.map((r) => r.userId);
}
