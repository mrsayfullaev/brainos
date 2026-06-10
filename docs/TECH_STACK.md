# BrainOS — технологический стек и сервисы для Docker (Шаг 7)

**Версия:** 4.0.0  
**Дата:** 2025-06-10  
**Назначение:** ответ на вопрос «какой стек?» и основа для `docker-compose.yml`  
**Контекст:** Docker в проекте **отсутствует**; прод сейчас — Ubuntu/Debian, PM2, Nginx, PostgreSQL и Redis на хосте (см. `docs/ENGINEER_MANUAL.md`).

---

## 1. Краткий ответ

| Вопрос | Ответ |
|--------|--------|
| **Runtime** | **Node.js** (>= 18, в проде обычно 20.x) |
| **Язык** | **TypeScript** (компиляция в `dist/`) |
| **PHP?** | **Нет** |
| **Python?** | **Нет** (как runtime приложения) |
| **Основная БД** | **PostgreSQL** >= 14 |
| **ORM** | **Prisma** 5.x |
| **Кэш / очереди** | **Redis** (опционально, но рекомендуется) |
| **Telegram** | **Grammy** |
| **HTTP API бэкенда** | встроенный `http` (порт **3333**) |
| **Дашборд** | **Next.js 14** + React 18 (отдельное приложение, порт **3001**) |
| **Оркестрация сейчас** | **PM2** (`ecosystem.config.cjs`), не Docker |
| **Прокси в проде** | **Nginx** + Certbot |

---

## 2. Архитектура: что за что отвечает

```
┌─────────────────────────────────────────────────────────────┐
│  Пользователь (Telegram)                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ long polling / API Telegram
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  brainos (корень репозитория)                                │
│  Node.js + TypeScript → dist/index.js                        │
│  • Grammy bot                                                │
│  • Модули (wallet, task, remind, notion, …)                  │
│  • HTTP server src/server.ts :3333                           │
│  • Prisma → PostgreSQL                                       │
│  • Redis (опц.) → кэш, OAuth state, BullMQ                   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
        PostgreSQL :5432              Redis :6379 (опц.)
               ▲
               │ тот же DATABASE_URL (если нужен)
┌──────────────┴──────────────────────────────────────────────┐
│  apps/dashboard (опционально)                                │
│  Next.js 14 → порт 3001                                      │
│  Запросы к бэкенду: NEXT_PUBLIC_API_URL → :3333             │
└─────────────────────────────────────────────────────────────┘

Внешние зависимости (не в репозитории):
  • OpenAI, GigaChat, Claude, Gemini API
  • Ollama :11434 (опционально, локальные модели)
  • Sentry (опционально)
```

**Важно:** это **не monorepo с workspaces** (нет Turborepo/pnpm workspaces). Два независимых Node-приложения с **отдельными** `package.json`:

| Путь | Роль | Entry | Сборка |
|------|------|-------|--------|
| `/` (корень) | Telegram-бот + HTTP API | `dist/index.js` | `npm run build` (`tsc`) |
| `apps/dashboard/` | Веб-дашборд аналитики | `next start -p 3001` | `npm run build` |

---

## 3. Бэкенд (корень репозитория)

### 3.1. Стек

- **Node.js** >= 18 (`package.json` → `engines.node`)
- **TypeScript** 5.x, dev-раннер **tsx**
- **Grammy** — Telegram Bot API
- **Prisma** + **@prisma/client** — PostgreSQL
- **BullMQ** + **ioredis** — фоновые очереди (только при `REDIS_URL`)
- **Zod** — валидация
- **Winston** — логи (`logs/`)
- **@sentry/node** — мониторинг (опционально)
- **node-cron** — планировщик модулей
- AI SDK: OpenAI, Anthropic, Google Generative AI, GigaChat (OAuth)

### 3.2. Точка входа и жизненный цикл

```text
src/index.ts
  → prisma.$connect()
  → startModuleScheduler()
  → startWebhookServer()     # HTTP :3333
  → startPredictionsWorker() # если Redis
  → bot.start()              # Grammy long polling
```

### 3.3. HTTP-сервер (не Express/Fastify)

Файл: `src/server.ts`

- Порт: `WEBHOOK_PORT` / `NOTION_WEBHOOK_PORT` / `GMAIL_WEBHOOK_PORT`, по умолчанию **3333**
- Эндпоинты: `/health`, OAuth callbacks, `/api/analytics/overview`, `/api/user/export`, `/api/auth/telegram`, статика из `public/`

### 3.4. База данных

**Prisma schema:** `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- **Только PostgreSQL** (не SQLite, не MySQL, не MongoDB)
- Миграции: `npm run prisma:migrate` (dev) / `npm run prisma:migrate:deploy` (prod)
- Перед стартом: `npm run prisma:generate`

Пример `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/brainos?schema=public"
```

В Docker hostname БД будет не `localhost`, а имя сервиса, например `postgres`.

---

## 4. Redis (опционально, но важно для Docker)

`REDIS_URL` не задан → бот **работает**, но:

- OAuth state (Notion/Gmail/Calendar) — **в памяти** (не для нескольких инстансов)
- кэш LLM — отключён
- очередь прогнозов BullMQ — **отключена**

Для production-like Docker **рекомендуется** сервис `redis:7`.

```env
REDIS_URL="redis://redis:6379"
```

---

## 5. Дашборд (`apps/dashboard`)

- **Next.js 14** (App Router)
- **React 18**, **Recharts**
- Порт: **3001** (`next dev -p 3001` / `next start -p 3001`)
- Отдельный `npm install` в `apps/dashboard/`

Переменные (`apps/dashboard/.env.local`):

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_API_URL` | URL бэкенда, напр. `http://brainos:3333` или `https://brainos.ai-khan.uz` |
| `NEXT_PUBLIC_TELEGRAM_BOT_NAME` | Имя бота для Telegram Login Widget |
| `NEXT_PUBLIC_ANALYTICS_API_KEY` | = `ANALYTICS_API_KEY` на бэкенде |

На бэкенде: `DASHBOARD_ORIGIN` — CORS origin дашборда (напр. `http://localhost:3001`).

---

## 6. Текущий деплой (без Docker)

Сейчас прод выглядит так (`ecosystem.config.cjs`, `docs/ENGINEER_MANUAL.md`):

| Процесс PM2 | Команда | cwd | Порт |
|-------------|---------|-----|------|
| `brainos` | `node dist/index.js` | `/var/www/brainos` | 3333 (HTTP) |
| `brainos-dashboard` | `next start -p 3001` | `/var/www/brainos/apps/dashboard` | 3001 |

Перед PM2:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build

cd apps/dashboard && npm install && npm run build
```

Nginx проксирует `brainos.ai-khan.uz` → `127.0.0.1:3333`.

---

## 7. Внешние сервисы (не контейнеризуются обязательно)

| Сервис | Порт / URL | Обязательность |
|--------|------------|----------------|
| Telegram Bot API | api.telegram.org | обязательно |
| OpenAI / GigaChat / др. | HTTPS | по ключам в `.env` |
| **Ollama** | `OLLAMA_BASE_URL`, обычно `http://localhost:11434` | опционально |
| Sentry | `SENTRY_DSN` | опционально |

Ollama — отдельный демон на хосте; в compose можно добавить образ `ollama/ollama`, если нужны локальные модели.

---

## 8. Карта портов для docker-compose

| Сервис compose | Образ / сборка | Порт (внутри сети) | Порт (на хост, пример) |
|----------------|----------------|--------------------|-------------------------|
| `postgres` | `postgres:16-alpine` | 5432 | 5432 (или не публиковать) |
| `redis` | `redis:7-alpine` | 6379 | опционально |
| `brainos` | build: `.` (Dockerfile) | 3333 | 3333 |
| `dashboard` | build: `apps/dashboard` | 3001 | 3001 |
| `nginx` | опционально | 80/443 | 80/443 |

**Минимальный compose для бота:** `postgres` + `brainos`  
**Рекомендуемый:** `postgres` + `redis` + `brainos`  
**Полный:** + `dashboard` (+ `nginx` снаружи или на хосте)

---

## 9. Переменные окружения (минимум для контейнера brainos)

Обязательные:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/brainos?schema=public
TELEGRAM_BOT_TOKEN=...
NODE_ENV=production
ENCRYPTION_KEY=...   # 64 hex-символа
```

AI (хотя бы один провайдер):

```env
OPENAI_API_KEY=...
GIGACHAT_CLIENT_ID=...
GIGACHAT_CLIENT_SECRET=...
```

Рекомендуемые:

```env
REDIS_URL=redis://redis:6379
BASE_URL=https://brainos.example.com
WEBHOOK_PORT=3333
DASHBOARD_ORIGIN=http://dashboard:3001
ANALYTICS_API_KEY=...
```

Полный список: `.env.example`, `docs/ENGINEER_MANUAL.md` §2.

---

## 10. Черновик docker-compose.yml (ориентир для Шага 7)

Проект **ещё не имеет** `Dockerfile` — это целевой шаблон, не готовый к `docker compose up` без доработки:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: brainos
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d brainos"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  brainos:
    build:
      context: .
      dockerfile: Dockerfile          # нужно создать
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/brainos?schema=public
      REDIS_URL: redis://redis:6379
      WEBHOOK_PORT: "3333"
    ports:
      - "3333:3333"
    # Команда после сборки: prisma migrate deploy && node dist/index.js

  dashboard:
    build:
      context: ./apps/dashboard
      dockerfile: Dockerfile          # нужно создать
    depends_on:
      - brainos
    environment:
      NEXT_PUBLIC_API_URL: http://brainos:3333
      NEXT_PUBLIC_TELEGRAM_BOT_NAME: YourBot
      NEXT_PUBLIC_ANALYTICS_API_KEY: ${ANALYTICS_API_KEY}
    ports:
      - "3001:3001"

volumes:
  postgres_data:
```

**Замечания для реализации Dockerfile бэкенда:**

1. `npm ci` → `npm run prisma:generate` → `npm run build`
2. При старте контейнера: `npx prisma migrate deploy` (БД должна быть доступна)
3. Grammy использует **long polling** — отдельный webhook-URL от Telegram не обязателен
4. Папка `logs/` — volume или stdout
5. `public/` — копировать в образ (статика для HTTP)

---

## 11. Чего в стеке нет

- PHP, Python (Django/FastAPI), Ruby, Go — **нет**
- MongoDB, MySQL, SQLite — **нет** (только PostgreSQL)
- Express / Fastify / NestJS — **нет** (свой `http.Server`)
- Docker / docker-compose в репозитории — **пока нет**
- Kubernetes — **нет**

---

## 12. Связанные файлы в репозитории

| Файл | Содержание |
|------|------------|
| `package.json` | зависимости бэкенда, скрипты |
| `apps/dashboard/package.json` | Next.js дашборд |
| `prisma/schema.prisma` | схема PostgreSQL |
| `.env.example` | переменные окружения |
| `ecosystem.config.cjs` | PM2 (текущий прод) |
| `docs/ENGINEER_MANUAL.md` | деплой без Docker |
| `README.md` | обзор и быстрый старт |

---

## 13. Итог для Шага 7

**Для `docker-compose.yml` нужны как минимум:**

1. **PostgreSQL** — обязательный persistent-сервис
2. **Redis** — желательный (очереди, OAuth, кэш)
3. **Контейнер Node.js** с корневого `package.json` (бот + API :3333)
4. **Опционально** — контейнер Next.js из `apps/dashboard` (:3001)
5. **Два Dockerfile** — пока их нет, их нужно добавить на Шаге 7

**Стек:** Node.js + TypeScript + PostgreSQL + (Redis) + Grammy + Prisma, плюс опционально Next.js для дашборда.
