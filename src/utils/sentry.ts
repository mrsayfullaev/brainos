/**
 * Sentry (опционально). Инициализация при наличии SENTRY_DSN.
 */

import * as Sentry from '@sentry/node';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}

export function captureException(err: unknown): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
}

export function flushSentry(): Promise<boolean> {
  return Sentry.close(2000);
}
