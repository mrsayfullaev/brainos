'use client';

import { useEffect, useState, useCallback } from 'react';
import Script from 'next/script';
import { loginWithTelegram, fetchOverview, type AnalyticsOverview } from '@/lib/api';
import { Charts } from './Charts';

const BOT_NAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ?? '';

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string>) => void;
  }
}

export function DashboardClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOverview(uid);
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('brainos_dashboard_userId') : null;
    if (stored) {
      setUserId(stored);
      loadOverview(stored);
    }
  }, [loadOverview]);

  useEffect(() => {
    if (userId) return;
    window.onTelegramAuth = async (user: Record<string, string>) => {
      setLoading(true);
      setError(null);
      try {
        const { userId: uid } = await loginWithTelegram(user);
        setUserId(uid);
        if (typeof localStorage !== 'undefined') localStorage.setItem('brainos_dashboard_userId', uid);
        await loadOverview(uid);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка входа');
      } finally {
        setLoading(false);
      }
    };
    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [userId, loadOverview]);

  const handleLogout = () => {
    setUserId(null);
    setOverview(null);
    if (typeof localStorage !== 'undefined') localStorage.removeItem('brainos_dashboard_userId');
  };

  if (!BOT_NAME) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', color: 'var(--muted)' }}>
        Задайте NEXT_PUBLIC_TELEGRAM_BOT_NAME в .env.local
      </div>
    );
  }

  if (!userId) {
    return (
      <>
        <Script src="https://telegram.org/js/telegram-widget.js?22" strategy="afterInteractive" />
        <div style={{ maxWidth: 360, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>BrainOS — Аналитика</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
            Войдите через Telegram, чтобы увидеть дашборд
          </p>
          <div
            id="telegram-login"
            data-telegram-login={BOT_NAME}
            data-size="large"
            data-radius="8"
            data-onauth="onTelegramAuth(user)"
            data-request-access="write"
          />
          {error && <p style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>}
          {loading && <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>Вход...</p>}
        </div>
      </>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>BrainOS — Аналитика</h1>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--card)',
            border: '1px solid var(--muted)',
            borderRadius: 8,
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          Выйти
        </button>
      </header>
      {error && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>}
      {loading && !overview && <p style={{ color: 'var(--muted)' }}>Загрузка...</p>}
      {overview && <Charts data={overview} />}
    </div>
  );
}
