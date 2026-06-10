/**
 * V4 Notion Integration: хранение подключения (OAuth token)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';

export async function getNotionConnection(userId: string) {
  const conn = await prisma.notionConnection.findUnique({
    where: { userId },
  });
  if (!conn) return null;
  const token = decrypt(conn.accessToken);
  return token ? { ...conn, accessToken: token } : null;
}

export async function setNotionConnection(
  userId: string,
  accessToken: string,
  workspaceId?: string | null
) {
  const enc = encrypt(accessToken);
  if (!enc) throw new Error('Encryption failed');
  return prisma.notionConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: enc,
      workspaceId: workspaceId ?? undefined,
    },
    update: {
      accessToken: enc,
      workspaceId: workspaceId ?? undefined,
    },
  });
}

export async function disconnectNotion(userId: string) {
  await prisma.notionConnection.deleteMany({ where: { userId } });
}

export async function updateLastSync(userId: string) {
  await prisma.notionConnection.updateMany({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });
}

export async function getAllNotionUserIds(): Promise<string[]> {
  const list = await prisma.notionConnection.findMany({
    select: { userId: true },
  });
  return list.map((r) => r.userId);
}

// ========== Привязка баз Notion (у каждого пользователя свои) ==========

export type NotionLinkedDbType = 'TASKS' | 'NOTES';

export async function getNotionLinkedDatabases(
  userId: string,
  type?: NotionLinkedDbType
) {
  const where: { userId: string; type?: 'TASKS' | 'NOTES' } = { userId };
  if (type) where.type = type;
  return prisma.notionLinkedDatabase.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
}

export async function addNotionLinkedDatabase(
  userId: string,
  type: NotionLinkedDbType,
  databaseId: string,
  label?: string | null
) {
  const cleanId = databaseId.replace(/-/g, '');
  return prisma.notionLinkedDatabase.upsert({
    where: {
      userId_databaseId: { userId, databaseId: cleanId },
    },
    create: {
      userId,
      type: type as 'TASKS' | 'NOTES',
      databaseId: cleanId,
      label: label ?? undefined,
    },
    update: { type: type as 'TASKS' | 'NOTES', label: label ?? undefined },
  });
}

export async function removeNotionLinkedDatabase(userId: string, databaseId: string) {
  const cleanId = databaseId.replace(/-/g, '');
  await prisma.notionLinkedDatabase.deleteMany({
    where: { userId, databaseId: cleanId },
  });
}
