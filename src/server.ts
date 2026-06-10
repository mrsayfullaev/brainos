/**
 * HTTP-сервер: health check (всегда), OAuth callbacks (Notion, Gmail), публичные страницы (оферта, политика и т.д.)
 * Порт: WEBHOOK_PORT и т.д. (по умолчанию 3333)
 */

import fs from 'fs';
import path from 'path';
import http from 'http';

const pathJoin = path.join;
const pathExtname = path.extname;
const pathResolve = path.resolve;
/** Базовые каталоги для public/images: от dist/ и от cwd (на случай разного запуска) */
const PUBLIC_IMAGES_DIRS = [
  pathJoin(__dirname, '..', 'public', 'images'),
  pathJoin(process.cwd(), 'public', 'images'),
];
import { prisma } from './database/client';
import { handleNotionOAuthCallback, isNotionOAuthConfigured } from './modules/notion/oauth';
import { handleGmailOAuthCallback, isGmailOAuthConfigured } from './modules/inbox/oauth';
import {
  handleCalendarOAuthCallback,
  isCalendarOAuthConfigured,
  getCalendarOAuthUrl,
} from './modules/meeting/calendar-oauth';
import { getAnalyticsOverview } from './modules/analytics/overview';
import { exportUserData } from './database/queries/export';
import { findUserByTelegramId } from './database/queries/user';
import { verifyTelegramLogin } from './utils/telegram-auth';
import { logger } from './utils/logger';

const HEALTH_PATH = '/health';
const ANALYTICS_OVERVIEW_PATH = '/api/analytics/overview';
const USER_EXPORT_PATH = '/api/user/export';
const TELEGRAM_AUTH_PATH = '/api/auth/telegram';
const NOTION_CALLBACK_PATH = '/auth/notion/callback';
const GMAIL_CALLBACK_PATH = '/auth/gmail/callback';
const CALENDAR_AUTH_PATH = '/auth/calendar';
const CALENDAR_CALLBACK_PATH = '/auth/calendar/callback';
const PORT = parseInt(
  process.env.WEBHOOK_PORT ??
    process.env.NOTION_WEBHOOK_PORT ??
    process.env.GMAIL_WEBHOOK_PORT ??
    '3333',
  10
);

/** Публичные страницы для Notion/интеграций: URL path → имя файла в public/ */
const PUBLIC_PAGES: Record<string, string> = {
  '/': 'index.html',
  '/offer': 'offer.html',
  '/privacy': 'privacy.html',
  '/consent': 'consent.html',
  '/about': 'about.html',
  '/instructions': 'instructions.html',
  '/instructions.html': 'instructions.html',
};
const LANG_CODES = ['en', 'ar', 'uz', 'es', 'tr'] as const;
const PAGE_SLUGS = ['about', 'offer', 'privacy', 'consent'] as const;
for (const lang of LANG_CODES) {
  PUBLIC_PAGES[`/${lang}`] = `${lang}/index.html`;
  for (const slug of PAGE_SLUGS) {
    PUBLIC_PAGES[`/${lang}/${slug}`] = `${lang}/${slug}.html`;
  }
}

type PageActive = 'home' | 'about' | 'offer' | 'privacy' | 'consent';
type LangCode = 'ru' | (typeof LANG_CODES)[number];

const NAV_BY_LANG: Record<LangCode, { home: string; about: string; offer: string; privacy: string }> = {
  ru: { home: 'Главная', about: 'Об авторе', offer: 'Оферта', privacy: 'Политика' },
  en: { home: 'Home', about: 'About', offer: 'Offer', privacy: 'Privacy' },
  ar: { home: 'الرئيسية', about: 'عن المؤلف', offer: 'العرض', privacy: 'الخصوصية' },
  uz: { home: 'Bosh sahifa', about: 'Muallif', offer: 'Taklif', privacy: 'Maxfiylik' },
  es: { home: 'Inicio', about: 'Autor', offer: 'Oferta', privacy: 'Privacidad' },
  tr: { home: 'Ana sayfa', about: 'Yazar', offer: 'Teklif', privacy: 'Gizlilik' },
};

const LANG_UI: Record<LangCode, { flag: string; label: string }> = {
  ru: { flag: '🇷🇺', label: 'RU' },
  en: { flag: '🇬🇧', label: 'EN' },
  ar: { flag: '🇸🇦', label: 'AR' },
  uz: { flag: '🇺🇿', label: 'UZ' },
  es: { flag: '🇪🇸', label: 'ES' },
  tr: { flag: '🇹🇷', label: 'TR' },
};

function getPageContext(path: string): { lang: LangCode; active: PageActive; prefix: string } {
  const m = path.match(/^\/(en|ar|uz|es|tr)(\/|$)/);
  const lang: LangCode = m ? (m[1] as LangCode) : 'ru';
  const prefix = lang === 'ru' ? '' : `/${lang}`;
  if (path === '/' || path === `/${lang}` || path === `/${lang}/`) return { lang, active: 'home', prefix };
  if (path.endsWith('/about') || path === '/about') return { lang, active: 'about', prefix };
  if (path.endsWith('/offer') || path === '/offer') return { lang, active: 'offer', prefix };
  if (path.endsWith('/privacy') || path === '/privacy') return { lang, active: 'privacy', prefix };
  if (path.endsWith('/consent') || path === '/consent') return { lang, active: 'consent', prefix };
  return { lang, active: 'home', prefix };
}

function fillHeader(context: { lang: LangCode; active: PageActive; prefix: string }): string {
  const publicDir = pathJoin(process.cwd(), 'public');
  let header = fs.readFileSync(pathJoin(publicDir, 'partials', 'header.html'), 'utf-8');
  const nav = NAV_BY_LANG[context.lang];
  const homeHref = context.prefix ? `${context.prefix}/` : '/';
  const active = (key: PageActive) => (context.active === key ? ' class="active"' : '');
  const replacements: Record<string, string> = {
    '{{HOME_HREF}}': homeHref,
    '{{HOME_LABEL}}': nav.home,
    '{{HOME_ACTIVE}}': active('home'),
    '{{ABOUT_HREF}}': `${context.prefix}/about`,
    '{{ABOUT_LABEL}}': nav.about,
    '{{ABOUT_ACTIVE}}': active('about'),
    '{{OFFER_HREF}}': `${context.prefix}/offer`,
    '{{OFFER_LABEL}}': nav.offer,
    '{{OFFER_ACTIVE}}': active('offer'),
    '{{PRIVACY_HREF}}': `${context.prefix}/privacy`,
    '{{PRIVACY_LABEL}}': nav.privacy,
    '{{PRIVACY_ACTIVE}}': active('privacy'),
    '{{CURRENT_FLAG}}': LANG_UI[context.lang].flag,
    '{{CURRENT_LABEL}}': LANG_UI[context.lang].label,
  };
  for (const [k, v] of Object.entries(replacements)) {
    header = header.split(k).join(v);
  }
  return header;
}

function getFooter(): string {
  const publicDir = pathJoin(process.cwd(), 'public');
  return fs.readFileSync(pathJoin(publicDir, 'partials', 'footer.html'), 'utf-8');
}

/** Подставляет общие шапку и футер в HTML страницы (плейсхолдеры <!-- HEADER --> и <!-- FOOTER -->) */
function composePage(html: string, path: string): string {
  const context = getPageContext(path);
  const header = fillHeader(context);
  const footer = getFooter();
  return html.replace('<!-- HEADER -->', header).replace('<!-- FOOTER -->', footer);
}

function parseBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseQuery(url: string): URLSearchParams {
  const i = url.indexOf('?');
  return new URLSearchParams(i >= 0 ? url.slice(i) : '');
}

const CORS_ORIGIN = process.env.DASHBOARD_ORIGIN ?? 'http://localhost:3001';

function setCorsHeaders(res: http.ServerResponse, origin?: string): void {
  const allow = origin && origin === CORS_ORIGIN ? origin : CORS_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Api-Key');
}

export function startWebhookServer(): void {
  const needNotion = isNotionOAuthConfigured();
  const needGmail = isGmailOAuthConfigured();
  const needCalendar = isCalendarOAuthConfigured();

  const server = http.createServer(async (req, res) => {
    const url = req.url ?? '';
    const path = url.split('?')[0];
    const origin = req.headers.origin as string | undefined;
    const isApiPath =
      path === ANALYTICS_OVERVIEW_PATH || path === USER_EXPORT_PATH || path === TELEGRAM_AUTH_PATH;

    if (req.method === 'OPTIONS' && isApiPath) {
      setCorsHeaders(res, origin);
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && path === HEALTH_PATH) {
      let dbStatus = 'unknown';
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch {
        dbStatus = 'error';
      }
      res.writeHead(dbStatus === 'connected' ? 200 : 503, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.end(JSON.stringify({ status: dbStatus === 'connected' ? 'ok' : 'degraded', db: dbStatus }));
      return;
    }

    if (req.method === 'GET' && path === ANALYTICS_OVERVIEW_PATH) {
      const q = parseQuery(url);
      const userId = q.get('userId') ?? (req.headers['x-user-id'] as string | undefined);
      const apiKey = req.headers['x-api-key'] as string | undefined;
      const expectedKey = process.env.ANALYTICS_API_KEY;
      if (!expectedKey) {
        setCorsHeaders(res, origin);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'API key not configured' }));
        return;
      }
      if (apiKey !== expectedKey) {
        setCorsHeaders(res, origin);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }
      if (!userId) {
        setCorsHeaders(res, origin);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Missing userId (query or X-User-Id header)' }));
        return;
      }
      try {
        const overview = await getAnalyticsOverview(userId);
        if (!overview) {
          setCorsHeaders(res, origin);
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }
        setCorsHeaders(res, origin);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(overview));
      } catch (err) {
        logger.error('Analytics overview error', err);
        setCorsHeaders(res, origin);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
      return;
    }

    if (req.method === 'GET' && path === USER_EXPORT_PATH) {
      const q = parseQuery(url);
      const userId = q.get('userId') ?? (req.headers['x-user-id'] as string | undefined);
      const apiKey = req.headers['x-api-key'] as string | undefined;
      const expectedKey = process.env.ANALYTICS_API_KEY;
      if (!expectedKey) {
        setCorsHeaders(res, origin);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'API key not configured' }));
        return;
      }
      if (apiKey !== expectedKey) {
        setCorsHeaders(res, origin);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }
      if (!userId) {
        setCorsHeaders(res, origin);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Missing userId (query or X-User-Id header)' }));
        return;
      }
      try {
        const data = await exportUserData(userId);
        const json = JSON.stringify(data, null, 2);
        setCorsHeaders(res, origin);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="brainos-export-${userId}-${new Date().toISOString().slice(0, 10)}.json"`,
        });
        res.end(json);
      } catch (err) {
        logger.error('User export error', err);
        setCorsHeaders(res, origin);
        res.writeHead(err instanceof Error && err.message === 'User not found' ? 404 : 500, {
          'Content-Type': 'application/json; charset=utf-8',
        });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }));
      }
      return;
    }

    if (req.method === 'GET' && path === NOTION_CALLBACK_PATH && needNotion) {
      const q = parseQuery(url);
      const result = await handleNotionOAuthCallback(q.get('code') ?? '', q.get('state') ?? '');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        result.ok
          ? '<p>Notion подключён. Можно закрыть вкладку и вернуться в бота.</p>'
          : `<p>Ошибка: ${result.error ?? 'unknown'}</p>`
      );
      return;
    }

    if (req.method === 'GET' && path === GMAIL_CALLBACK_PATH && needGmail) {
      const q = parseQuery(url);
      const result = await handleGmailOAuthCallback(q.get('code') ?? '', q.get('state') ?? '');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        result.ok
          ? '<p>Gmail подключён. Можно закрыть вкладку и вернуться в бота.</p>'
          : `<p>Ошибка: ${result.error ?? 'unknown'}</p>`
      );
      return;
    }

    if (req.method === 'GET' && path === CALENDAR_AUTH_PATH && needCalendar) {
      const q = parseQuery(url);
      const userId = q.get('userId');
      if (!userId) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Missing userId');
        return;
      }
      const redirectUrl = getCalendarOAuthUrl(userId);
      if (!redirectUrl) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Calendar OAuth not configured');
        return;
      }
      res.writeHead(302, { Location: redirectUrl });
      res.end();
      return;
    }

    if (req.method === 'GET' && path === CALENDAR_CALLBACK_PATH && needCalendar) {
      const q = parseQuery(url);
      const result = await handleCalendarOAuthCallback(q.get('code') ?? '', q.get('state') ?? '');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        result.ok
          ? '<p>Google Calendar подключён. Можно закрыть вкладку и вернуться в бота.</p>'
          : `<p>Ошибка: ${result.error ?? 'unknown'}</p>`
      );
      return;
    }

    if (req.method === 'POST' && path === TELEGRAM_AUTH_PATH) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        setCorsHeaders(res, origin);
        res.writeHead(501, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Telegram auth not configured' }));
        return;
      }
      try {
        const rawBody = await parseBody(req);
        const payload = JSON.parse(rawBody.toString()) as Record<string, string>;
        if (!payload.id || !payload.hash || !payload.auth_date) {
          setCorsHeaders(res, origin);
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Missing id, hash or auth_date' }));
          return;
        }
        if (!verifyTelegramLogin(payload, botToken)) {
          setCorsHeaders(res, origin);
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid Telegram signature' }));
          return;
        }
        const user = await findUserByTelegramId(BigInt(payload.id));
        if (!user) {
          setCorsHeaders(res, origin);
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }
        setCorsHeaders(res, origin);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ userId: user.id }));
      } catch (err) {
        logger.error('Telegram auth error', err);
        setCorsHeaders(res, origin);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
      return;
    }

    if (req.method === 'GET' && path.startsWith('/images/')) {
      const subPath = path.slice('/images/'.length).replace(/\.\./g, '').replace(/^\/+/, '');
      if (!subPath) {
        res.writeHead(404);
        res.end();
        return;
      }
      const types: Record<string, string> = {
        '.svg': 'image/svg+xml; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
      };
      const ext = pathExtname(subPath).toLowerCase();
      for (const publicImagesDir of PUBLIC_IMAGES_DIRS) {
        const filePath = pathJoin(publicImagesDir, subPath);
        const dirResolved = pathResolve(publicImagesDir);
        if (pathResolve(filePath).indexOf(dirResolved) !== 0) continue;
        try {
          const data = fs.readFileSync(filePath);
          res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
          res.end(data);
          return;
        } catch {
          /* пробуем следующий каталог */
        }
      }
      res.writeHead(404);
      res.end();
      return;
    }

    if (req.method === 'GET' && path.startsWith('/css/')) {
      const subPath = path.slice('/css/'.length).replace(/\.\./g, '').replace(/^\/+/, '');
      if (!subPath || !subPath.endsWith('.css')) {
        res.writeHead(404);
        res.end();
        return;
      }
      const publicDir = pathJoin(process.cwd(), 'public');
      const filePath = pathJoin(publicDir, 'css', subPath);
      const dirResolved = pathResolve(pathJoin(publicDir, 'css'));
      if (pathResolve(filePath).indexOf(dirResolved) !== 0) {
        res.writeHead(404);
        res.end();
        return;
      }
      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    if (req.method === 'GET' && PUBLIC_PAGES[path]) {
      const fileName = PUBLIC_PAGES[path];
      const publicDir = pathJoin(process.cwd(), 'public');
      const filePath = pathJoin(publicDir, fileName);
      try {
        let html = fs.readFileSync(filePath, 'utf-8');
        html = composePage(html, path);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, () => {
    const parts = [HEALTH_PATH, ANALYTICS_OVERVIEW_PATH, TELEGRAM_AUTH_PATH];
    if (needNotion) parts.push(NOTION_CALLBACK_PATH);
    if (needGmail) parts.push(GMAIL_CALLBACK_PATH);
    if (needCalendar) {
      parts.push(CALENDAR_AUTH_PATH);
      parts.push(CALENDAR_CALLBACK_PATH);
    }
    logger.info(`HTTP server listening on port ${PORT}: ${parts.join(', ')}`);
  });

  server.on('error', (err) => {
    logger.error('Webhook server error:', err);
  });
}
