/**
 * Courses Module - Queries (V3)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';

export async function createCourse(params: {
  userId: string;
  title: string;
  platform?: string;
  instructor?: string;
  totalLessons?: number;
  url?: string;
}) {
  const encTitle = encrypt(params.title);
  if (!encTitle) throw new Error('Encryption failed');
  return prisma.course.create({
    data: {
      userId: params.userId,
      title: encTitle,
      platform: params.platform ? encrypt(params.platform) : null,
      instructor: params.instructor ? encrypt(params.instructor) : null,
      totalLessons: params.totalLessons,
      url: params.url ? encrypt(params.url) : null,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });
}

export async function getCourses(userId: string, status?: string) {
  const courses = await prisma.course.findMany({
    where: { userId, ...(status ? { status: status as any } : {}) },
    orderBy: { updatedAt: 'desc' },
  });
  return courses.map((c) => ({
    ...c,
    title: decrypt(c.title) || '',
    platform: c.platform ? decrypt(c.platform) : null,
    instructor: c.instructor ? decrypt(c.instructor) : null,
    url: c.url ? decrypt(c.url) : null,
  }));
}

export async function updateProgress(courseId: string, userId: string, currentLesson: number) {
  const course = await prisma.course.findFirst({ where: { id: courseId, userId } });
  if (!course) throw new Error('Course not found');
  const isCompleted = course.totalLessons != null && currentLesson >= course.totalLessons;
  return prisma.course.update({
    where: { id: courseId },
    data: {
      currentLesson,
      status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: isCompleted ? new Date() : null,
    },
  });
}

export function progressPercent(course: { totalLessons: number | null; currentLesson: number }): number {
  if (!course.totalLessons) return 0;
  return Math.round((course.currentLesson / course.totalLessons) * 100);
}
