/**
 * V4 Meeting Agent — Google Calendar API v3 (refresh token, list events)
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export async function refreshCalendarAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar token refresh failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string; refresh_token?: string };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
  };
}

export interface CalendarEventItem {
  id: string;
  summary: string | null;
  start: Date;
  end: Date;
  location: string | null;
}

/**
 * Список событий календаря в заданном диапазоне (RFC3339 timeMin/timeMax)
 */
export async function listCalendarEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEventItem[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });
  const url = `${CALENDAR_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Calendar list events failed: ${res.status}`);
  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      location?: string;
      status?: string;
    }>;
  };
  const items = data.items ?? [];
  const result: CalendarEventItem[] = [];
  for (const ev of items) {
    if (ev.status === 'cancelled') continue;
    const startStr = ev.start?.dateTime ?? ev.start?.date;
    const endStr = ev.end?.dateTime ?? ev.end?.date;
    if (!startStr || !endStr) continue;
    const start = new Date(startStr);
    const end = new Date(endStr);
    result.push({
      id: ev.id,
      summary: ev.summary ?? null,
      start,
      end,
      location: ev.location ?? null,
    });
  }
  return result;
}
