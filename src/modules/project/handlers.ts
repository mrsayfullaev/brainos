/**
 * Projects Module - Handlers (V3)
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createProject, getProjects, addMilestone } from './queries';

export async function handleProjectMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const trimmed = message.replace(/^@project\s*/i, '').trim();

  if (/список|list|проекты|projects/i.test(trimmed) && trimmed.length < 25) {
    const projects = await getProjects(user.id);
    const lines = projects.map((p) => `• ${p.name} (${p.status}, ${p.milestones.length} milestones)`).join('\n');
    return {
      modulePrompt: `Projects:\n${lines || 'None. Add: "проект Новый сайт"'}.\nReply in ${user.language}.`,
      data: { projects },
    };
  }

  if (/этап|milestone|веха/i.test(trimmed)) {
    const projects = await getProjects(user.id);
    const project = projects.find((p) => p.status === 'ACTIVE') || projects[0];
    if (!project) return { modulePrompt: `No project. Create one first. Reply in ${user.language}.` };
    const title = trimmed.replace(/этап|milestone|веха/gi, '').trim() || 'Этап';
    await addMilestone(project.id, user.id, title);
    return { modulePrompt: `Milestone "${title}" added to ${project.name}. Reply in ${user.language}.` };
  }

  const name = trimmed.replace(/проект|project/gi, '').trim() || 'Проект';
  await createProject({ userId: user.id, name });
  const total = (await getProjects(user.id)).length;
  return { modulePrompt: `Project "${name}" created. Total: ${total}. Reply in ${user.language}.` };
}
