/**
 * Часовой пояс пользователя в формате UTC+3, UTC-5 и т.д.
 * Используется для дайджестов, DND, напоминаний — везде время пользователя.
 */

/** Парсит строку "UTC+3" или "UTC-5" в смещение в минутах (от UTC). */
export function parseUtcOffset(timezone: string | null | undefined): number {
  if (!timezone || typeof timezone !== 'string') return 0;
  const m = timezone.trim().match(/^UTC([+-])(\d{1,2})(?::(\d{2}))?$/i);
  if (!m) return 0;
  const sign = m[1] === '+' ? 1 : -1;
  const hours = parseInt(m[2], 10);
  const minutes = m[3] ? parseInt(m[3], 10) : 0;
  return sign * (hours * 60 + minutes);
}

/** Возвращает локальное время пользователя в формате "HH:MM" для переданного UTC момента. */
export function getLocalHHMM(utcDate: Date, offsetMinutes: number): string {
  const totalMinutes = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes() + offsetMinutes;
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Проверяет, попадает ли локальное время "HH:MM" в диапазон [start, end) (оба в формате "HH:MM"). Через полночь поддерживается (например 22:00–08:00). */
export function isLocalTimeInRange(localHHMM: string, start: string, end: string): boolean {
  const toMins = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const nowM = toMins(localHHMM);
  const startM = toMins(start);
  const endM = toMins(end);
  if (startM <= endM) return nowM >= startM && nowM < endM;
  return nowM >= startM || nowM < endM;
}

/** Для крона дайджеста: текущее локальное время пользователя в "HH:MM". */
export function getCurrentLocalHHMM(offsetMinutes: number): string {
  return getLocalHHMM(new Date(), offsetMinutes);
}

/**
 * Строит UTC Date из локальной даты/времени пользователя (год, месяц, день, часы, минуты в его поясе).
 */
export function localToUtcDate(
  year: number,
  month: number,
  date: number,
  hours: number,
  minutes: number,
  offsetMinutes: number
): Date {
  const localMins = hours * 60 + minutes - offsetMinutes;
  const utcDate = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
  utcDate.setUTCMinutes(utcDate.getUTCMinutes() + localMins);
  return utcDate;
}

/** Список вариантов часового пояса для выбора в настройках (UTC-11 … UTC+14). */
export const UTC_OFFSET_OPTIONS: string[] = (() => {
  const list: string[] = [];
  for (let h = -11; h <= 14; h++) {
    list.push(h >= 0 ? `UTC+${h}` : `UTC${h}`);
  }
  return list;
})();
