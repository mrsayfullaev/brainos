const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const API_KEY = process.env.NEXT_PUBLIC_ANALYTICS_API_KEY ?? '';

export interface AnalyticsOverview {
  userId: string;
  wallet: {
    income: number;
    expenses: number;
    balance: number;
    period: { from: string; to: string };
  };
  tasks: { total: number; todo: number; inProgress: number; done: number };
  habits: { total: number; active: number; completionsThisMonth: number };
  health: { entriesCount: number };
}

export async function loginWithTelegram(payload: Record<string, string>): Promise<{ userId: string }> {
  const res = await fetch(`${API_URL}/api/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Login failed');
  }
  return res.json();
}

export async function fetchOverview(userId: string): Promise<AnalyticsOverview> {
  const headers: Record<string, string> = { 'X-User-Id': userId };
  if (API_KEY) headers['X-Api-Key'] = API_KEY;
  const res = await fetch(`${API_URL}/api/analytics/overview?userId=${encodeURIComponent(userId)}`, {
    headers,
  });
  if (!res.ok) throw new Error('Failed to load analytics');
  return res.json();
}
