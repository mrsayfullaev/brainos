/**
 * V4 Meeting Agent — запросы к БД
 */

import { prisma } from '../../database/client';
import { decrypt, encrypt } from '../../utils/encryption';

/**
 * Встречи через 50–60 минут без заполненной повестки (для препа)
 */
export async function getUpcomingMeetingsNeedingPrep() {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 50 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);

  const meetings = await prisma.meeting.findMany({
    where: {
      scheduledAt: { gte: windowStart, lte: windowEnd },
      agenda: null,
      status: 'SCHEDULED',
    },
    include: { user: true },
  });

  return meetings.map((m) => {
    let titleDecrypted: string | null = null;
    if (m.title) {
      try {
        titleDecrypted = decrypt(m.title);
      } catch {
        titleDecrypted = m.title;
      }
    }
    return { ...m, titleDecrypted };
  });
}

/**
 * Сохранить сгенерированную повестку
 */
export async function setMeetingAgenda(meetingId: string, agenda: string) {
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { agenda: encrypt(agenda) },
  });
}

// ========== Google Calendar ==========

export async function getCalendarConnection(userId: string) {
  const conn = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
  });
  if (!conn) return null;
  return {
    ...conn,
    accessToken: decrypt(conn.accessToken),
    refreshToken: decrypt(conn.refreshToken),
  };
}

export async function setCalendarConnection(
  userId: string,
  accessToken: string,
  refreshToken: string
) {
  const encAccess = encrypt(accessToken);
  const encRefresh = encrypt(refreshToken);
  if (!encAccess || !encRefresh) throw new Error('Encryption failed');
  await prisma.googleCalendarConnection.upsert({
    where: { userId },
    create: { userId, accessToken: encAccess, refreshToken: encRefresh },
    update: { accessToken: encAccess, refreshToken: encRefresh },
  });
}

export async function getUsersWithCalendarConnection(): Promise<string[]> {
  const rows = await prisma.googleCalendarConnection.findMany({
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

/** Создать или обновить встречу по calendarId (для sync из Google Calendar) */
export async function upsertMeetingFromCalendar(
  userId: string,
  data: {
    calendarId: string;
    title: string | null;
    scheduledAt: Date;
    durationMinutes: number;
    location: string | null;
  }
) {
  const encTitle = data.title ? encrypt(data.title) : undefined;
  const encLocation = data.location ? encrypt(data.location) : undefined;
  const existing = await prisma.meeting.findFirst({
    where: { userId, calendarId: data.calendarId },
  });
  if (existing) {
    await prisma.meeting.update({
      where: { id: existing.id },
      data: {
        ...(encTitle != null ? { title: encTitle as string } : {}),
        ...(encLocation != null ? { location: encLocation as string } : {}),
        scheduledAt: data.scheduledAt,
        duration: data.durationMinutes,
      },
    });
  } else {
    await prisma.meeting.create({
      data: {
        userId,
        calendarId: data.calendarId,
        ...(encTitle != null && { title: encTitle as string }),
        ...(encLocation != null && { location: encLocation as string }),
        scheduledAt: data.scheduledAt,
        duration: data.durationMinutes,
        status: 'SCHEDULED',
      },
    });
  }
}
