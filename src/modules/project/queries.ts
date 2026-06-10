/**
 * Projects Module - Queries (V3)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';

export async function createProject(params: { userId: string; name: string; description?: string; deadline?: Date }) {
  const encName = encrypt(params.name);
  if (!encName) throw new Error('Encryption failed');
  return prisma.project.create({
    data: {
      userId: params.userId,
      name: encName,
      description: params.description ? encrypt(params.description) : null,
      deadline: params.deadline,
    },
  });
}

export async function getProjects(userId: string, status?: string) {
  const projects = await prisma.project.findMany({
    where: { userId, ...(status ? { status: status as any } : {}) },
    include: { milestones: true },
    orderBy: { updatedAt: 'desc' },
  });
  return projects.map((p) => ({
    ...p,
    name: decrypt(p.name) || '',
    description: p.description ? decrypt(p.description) : null,
  }));
}

export async function addMilestone(projectId: string, userId: string, title: string, deadline?: Date) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) throw new Error('Project not found');
  return prisma.milestone.create({
    data: {
      projectId,
      title: encrypt(title) || title,
      deadline,
    },
  });
}

export async function completeMilestone(milestoneId: string, userId: string) {
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId },
    include: { project: true },
  });
  if (!milestone || milestone.project.userId !== userId) throw new Error('Not found');
  return prisma.milestone.update({
    where: { id: milestoneId },
    data: { completed: true, completedAt: new Date() },
  });
}
