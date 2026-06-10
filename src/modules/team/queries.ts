/**
 * V4 Team Workspaces: воркспейсы, участники, роли, общие задачи и заметки
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import type { WorkspaceRole } from '@prisma/client';

const ROLE_ORDER: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
};

function hasMinRole(userRole: WorkspaceRole, required: WorkspaceRole): boolean {
  return ROLE_ORDER[userRole] >= ROLE_ORDER[required];
}

/**
 * Создаёт воркспейс; создатель становится ADMIN
 */
export async function createWorkspace(userId: string, name: string) {
  const encName = encrypt(name);
  if (!encName) throw new Error('Encryption failed');
  const workspace = await prisma.workspace.create({
    data: {
      name: encName,
      members: {
        create: { userId, role: 'ADMIN' },
      },
    },
    include: { members: true },
  });
  return {
    ...workspace,
    name: decrypt(workspace.name) ?? name,
  };
}

/**
 * Список воркспейсов пользователя
 */
export async function getWorkspacesForUser(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
  });
  return memberships.map((m) => ({
    ...m.workspace,
    name: decrypt(m.workspace.name) ?? '',
    role: m.role,
  }));
}

/**
 * Участники воркспейса (с расшифрованным именем воркспейса)
 */
export async function getWorkspaceMembers(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!workspace) return null;
  return {
    ...workspace,
    name: decrypt(workspace.name) ?? '',
    members: workspace.members.map((m) => ({
      userId: m.userId,
      role: m.role,
      userName: m.user.name,
    })),
  };
}

/**
 * Добавляет участника (требуется ADMIN)
 */
export async function addMember(
  workspaceId: string,
  userId: string,
  newUserId: string,
  role: WorkspaceRole = 'MEMBER'
) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member || !hasMinRole(member.role, 'ADMIN')) return null;
  return prisma.workspaceMember.create({
    data: { workspaceId, userId: newUserId, role },
  });
}

/**
 * Меняет роль участника (требуется ADMIN; нельзя понизить себя)
 */
export async function setRole(
  workspaceId: string,
  adminUserId: string,
  targetUserId: string,
  role: WorkspaceRole
) {
  const admin = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: adminUserId } },
  });
  if (!admin || !hasMinRole(admin.role, 'ADMIN')) return null;
  if (adminUserId === targetUserId) return null; // нельзя менять свою роль через setRole
  return prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    data: { role },
  });
}

/**
 * Удаляет участника (ADMIN или сам себя)
 */
export async function removeMember(
  workspaceId: string,
  userId: string,
  targetUserId: string
) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) return null;
  const isSelf = userId === targetUserId;
  if (!isSelf && !hasMinRole(member.role, 'ADMIN')) return null;
  return prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
}

/**
 * Проверяет доступ: есть ли пользователь в воркспейсе и с какой ролью.
 * minRole — минимальная роль (по умолчанию VIEWER).
 */
export async function canAccessWorkspace(
  userId: string,
  workspaceId: string,
  minRole: WorkspaceRole = 'VIEWER'
): Promise<boolean> {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return m ? hasMinRole(m.role, minRole) : false;
}

/**
 * Возвращает роль пользователя в воркспейсе или null
 */
export async function getMemberRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRole | null> {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return m?.role ?? null;
}
