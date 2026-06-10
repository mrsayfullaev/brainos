/**
 * V4 Meeting Agent — синхронизация событий Google Calendar → Meeting
 */

import { logger } from '../../utils/logger';
import { getCalendarConnection, setCalendarConnection, getUsersWithCalendarConnection, upsertMeetingFromCalendar } from './queries';
import { refreshCalendarAccessToken, listCalendarEvents } from './calendar-api';

const CALENDAR_CLIENT_ID = process.env.CALENDAR_CLIENT_ID;
const CALENDAR_CLIENT_SECRET = process.env.CALENDAR_CLIENT_SECRET;

/**
 * Синхронизирует события Google Calendar в диапазоне [now, now+7 дней] в записи Meeting для пользователя.
 * Обновляет access token при 401.
 */
export async function syncCalendarToMeetings(userId: string): Promise<{ synced: number; error?: string }> {
  const conn = await getCalendarConnection(userId);
  if (!conn?.accessToken || !conn?.refreshToken) return { synced: 0, error: 'No calendar connection' };
  if (!CALENDAR_CLIENT_ID || !CALENDAR_CLIENT_SECRET) {
    return { synced: 0, error: 'Calendar OAuth not configured' };
  }

  let accessToken: string = conn.accessToken;
  const refreshToken: string = conn.refreshToken;
  const timeMin = new Date();
  const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const fetchEvents = async (): Promise<ReturnType<typeof listCalendarEvents>> => {
    const events = await listCalendarEvents(accessToken, timeMin, timeMax);
    return events;
  };

  let events: Awaited<ReturnType<typeof listCalendarEvents>>;
  try {
    events = await fetchEvents();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401') || msg.includes('invalid_grant')) {
      try {
        const refreshed = await refreshCalendarAccessToken(
          refreshToken,
          CALENDAR_CLIENT_ID,
          CALENDAR_CLIENT_SECRET
        );
        await setCalendarConnection(userId, refreshed.accessToken, refreshed.refreshToken);
        accessToken = refreshed.accessToken;
        events = await listCalendarEvents(accessToken, timeMin, timeMax);
      } catch (refreshErr) {
        logger.error('Calendar token refresh failed for user', userId, refreshErr);
        return { synced: 0, error: (refreshErr as Error).message };
      }
    } else {
      logger.error('Calendar list events failed for user', userId, err);
      return { synced: 0, error: msg };
    }
  }

  let synced = 0;
  for (const ev of events) {
    const durationMinutes = Math.max(1, Math.round((ev.end.getTime() - ev.start.getTime()) / 60000));
    await upsertMeetingFromCalendar(userId, {
      calendarId: ev.id,
      title: ev.summary,
      scheduledAt: ev.start,
      durationMinutes,
      location: ev.location,
    });
    synced++;
  }
  if (synced > 0) logger.info(`Calendar sync: user ${userId}, ${synced} event(s)`);
  return { synced };
}

/**
 * Запуск синка для всех пользователей с подключённым календарём (вызывается из cron).
 */
export async function runCalendarSyncForAllUsers(): Promise<void> {
  const userIds = await getUsersWithCalendarConnection();
  for (const userId of userIds) {
    try {
      await syncCalendarToMeetings(userId);
    } catch (err) {
      logger.error('Calendar sync error for user', userId, err);
    }
  }
}
