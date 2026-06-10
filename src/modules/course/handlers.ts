/**
 * Courses Module - Handlers (V3)
 */

import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '../types';
import { createCourse, getCourses, updateProgress, progressPercent } from './queries';

export async function handleCourseMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  const trimmed = message.replace(/^@course\s*/i, '').trim();

  if (/прогресс|progress|урок \d+|lesson \d+/i.test(trimmed)) {
    const numMatch = trimmed.match(/\d+/);
    const courses = await getCourses(user.id);
    const course = courses[courses.length - 1];
    if (!course || !numMatch) {
      return { modulePrompt: `Specify course and lesson number. Reply in ${user.language}.` };
    }
    await updateProgress(course.id, user.id, parseInt(numMatch[0]));
    const pct = progressPercent(course);
    return {
      modulePrompt: `Progress updated: lesson ${numMatch[0]}, ${pct}% total. Confirm in ${user.language}.`,
    };
  }

  if (/список|list|курсы|courses/i.test(trimmed) && trimmed.length < 25) {
    const courses = await getCourses(user.id);
    const lines = courses.map((c) => `• ${c.title} — ${c.currentLesson}${c.totalLessons ? `/${c.totalLessons}` : ''} (${c.status})`).join('\n');
    return {
      modulePrompt: `Courses:\n${lines || 'None. Add: курс React на Udemy'}. Reply in ${user.language}.`,
      data: { courses },
    };
  }

  const title = trimmed.replace(/курс|course/gi, '').trim() || 'Курс';
  await createCourse({ userId: user.id, title });
  const total = (await getCourses(user.id)).length;
  return {
    modulePrompt: `Course "${title}" added. Total: ${total}. Reply in ${user.language}.`,
  };
}
