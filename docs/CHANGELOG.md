# BrainOS Changelog

## Version 4.0.0-alpha (2026-02) - V4 Enterprise

### Инфраструктура
- **Redis:** клиент (REDIS_URL), cacheGet/cacheSet/cacheDel, OAuth state для Notion/Gmail/Calendar при наличии Redis.
- **Sentry:** инициализация по SENTRY_DSN, captureException в main и bot.catch, flush при завершении.
- **BullMQ:** очередь predictions, воркер для еженедельных прогнозов; при наличии Redis cron ставит задачу в очередь вместо прямого вызова.
- **HTTP-сервер:** GET /health, GET /api/analytics/overview, POST /api/auth/telegram, OAuth callbacks (Notion, Gmail, Google Calendar), POST /webhooks/stripe. CORS для дашборда (DASHBOARD_ORIGIN).
- **Документация API:** docs/API.md — эндпоинты, порты, OAuth.

### Meeting Agent
- Модель Meeting, cron преподготовки за 1 ч до встречи (system LLM, отправка в Telegram).
- **Google Calendar:** OAuth (CALENDAR_CLIENT_ID/SECRET), модель GoogleCalendarConnection, синк событий → Meeting каждые 30 мин. Маршруты GET /auth/calendar?userId=…, GET /auth/calendar/callback.

### Email Agent (@inbox)
- EmailAccount, EmailThread, Gmail OAuth (URL + /auth/gmail/callback), команда /inbox.
- Триаж (URGENT/IMPORTANT/NORMAL/SPAM) через systemLLMGenerate, реальный fetch inbox (Gmail API). Автоответ/отправка писем не в scope.
- Cron: fetch каждые 30 мин для пользователей с EmailAccount.

### Notion Integration
- NotionConnection, OAuth (/auth/notion/callback), команда /notion и **/notion_link** (привязка баз по пользователю).
- **NotionLinkedDatabase:** у каждого пользователя свои базы (type: TASKS | NOTES, databaseId), без глобального ID в env.
- Двусторонний sync задач и заметок по привязанным базам; cron ежедневно 3:00.

### Analytics и дашборд
- GET /api/analytics/overview (userId, опц. X-Api-Key): wallet за месяц, задачи, привычки, health.
- **Next.js дашборд** (apps/dashboard): графики (Recharts), вход через Telegram Login, POST /api/auth/telegram (проверка подписи). PM2-процесс brainos-dashboard в ecosystem.config.cjs (порт 3001).

### Прочее V4 (уже было ранее)
- Billing + Stripe, Workflow Engine, Research Agent, Smart Notifications, AI Predictions, Voice Assistant, Team Workspaces.
- README: разделы про мониторинг, дашборд, команды /notion_link, ссылка на docs/API.md.

---

## Version 3.0.0-alpha (2025-02-08) - V3 Modules Start

### V3 Infrastructure
- **Prisma:** Добавлены модели для 9 модулей V3 (Knowledge Base, Habits, Investments, Courses, Email, Read Later, Projects, Car, Pets).
- **User:** Поле `username` для коллаборации в Projects.
- **Зависимости:** cheerio, mammoth, pdf-parse для парсинга файлов и URL.

### Knowledge Base Module (@kb)
- Личная база знаний: страницы с заголовком и контентом (markdown).
- Семантический поиск по эмбеддингам (OpenAI text-embedding-3-small), хранение в JSON; косинусное сходство в приложении.
- Вопросы по базе: «что такое X?» / «как настроить Y?» — ответ по релевантным страницам через race AI.
- Граф вики-ссылок: `[[Page]]` и вывод графа (nodes/edges).
- Парсер: извлечение текста из PDF/DOCX/TXT (pdf-parse, mammoth), извлечение вики-ссылок.
- Шифрование: title, content в БД.
- Модуль зарегистрирован в роутере и в списке модулей для intent analysis.

### Read Later (@later)
- Закладки по URL с извлечением метаданных (cheerio + axios): title, description, og:image, тип (ARTICLE/VIDEO/PODCAST).
- Сохранение, список непрочитанных, теги.

### Email (@email)
- Генерация черновиков писем через race AI, шаблоны (увольнение, жалоба, приглашение, благодарность, извинение, follow-up, знакомство), тон (FORMAL/CASUAL/FRIENDLY/ASSERTIVE).
- Сохранение в EmailDraft с шифрованием subject, body, recipient.

### Habits (@habit)
- Привычки с частотой (DAILY/WEEKLY), отметки выполнения, расчёт стриков (current/longest), данные для heatmap по году.

### Courses (@course)
- Курсы с платформой, инструктором, totalLessons, currentLesson, статус (IN_PROGRESS/COMPLETED и др.), обновление прогресса.

### Pets (@pet)
- Питомцы (имя, вид, порода), прививки с nextDue, визиты к вету, кормления.
- Cron: напоминания о прививках (ежедневно 9:00), пока только логирование (отправка в Telegram — TODO).

### Investments (@invest)
- Портфель: акции (Alpha Vantage) и крипта (CoinGecko), покупка/продажа, расчёт стоимости и P/L.
- Запрос цены: «цена AAPL», «сколько стоит BTC».

### Projects (@project)
- Проекты с описанием, дедлайном, статусом; этапы (milestones) с завершением.

### Car (@car)
- Авто (марка, модель, год), сервисы (OIL_CHANGE, TIRE_ROTATION, INSPECTION, REPAIR), заправки (литры, сумма, пробег), штрафы.

---

## Version 2.0.0-alpha (2024-02-08) - Wallet Module

### 🎯 Major Features

#### Wallet Module (Reference Implementation)
- **Parser** (`src/modules/wallet/parser.ts`)
  - NLP parsing with Ollama (language-specific models)
  - Automatic category detection (8 categories)
  - Fallback parser for reliability
  - Support for natural language input

- **Queries** (`src/modules/wallet/queries.ts`)
  - CRUD operations with auto-encrypt/decrypt
  - Transaction management (create, read, update, delete)
  - Budget management
  - Period-based queries
  - Budget usage tracking

- **Handlers** (`src/modules/wallet/handlers.ts`)
  - Transaction processing
  - Budget alert detection
  - Monthly stats calculation
  - AI prompt building with context

- **Analytics** (`src/modules/wallet/analytics.ts`)
  - Weekly digest generation
  - Spending pattern analysis
  - Monthly expense forecasting
  - Anomaly detection

- **Cron Jobs** (`src/modules/wallet/cron.ts`)
  - Weekly digests (Sundays at 8 PM)
  - Budget alerts (daily at 6 PM)
  - Monthly forecast (25th of month at 10 AM)

### 🗄️ Database

#### New Models
```prisma
model Transaction {
  - Tracks income/expenses
  - Encrypted: description, category
  - Indexes: userId+date, userId+type, userId+category
}

model Budget {
  - Monthly/weekly/yearly budgets per category
  - Encrypted: category
  - Unique: userId+category+period
}

enum TxType { INCOME, EXPENSE }
enum Period { WEEKLY, MONTHLY, YEARLY }
```

### 📊 Features

- ✅ Natural language transaction input
- ✅ Automatic category detection
- ✅ Budget tracking with 90% alerts
- ✅ Weekly financial digests with AI insights
- ✅ Monthly expense forecasting
- ✅ Spending pattern analysis
- ✅ Multi-currency support
- ✅ AES-256-GCM encryption

### 📚 Documentation

#### New Files
- `docs/WALLET_MODULE_USER_GUIDE.md` - User manual
- `docs/WALLET_MODULE_DEV_GUIDE.md` - Developer reference
- `src/modules/README.md` - Module quick start

### 🔄 Changes

#### Module Infrastructure
- Updated `src/modules/scheduler.ts` - Added 3 wallet cron jobs
- Updated `src/modules/index.ts` - Imported wallet module
- Updated `prisma/schema.prisma` - Added Transaction and Budget models

### ✅ Stats

- **Files created:** 9
- **Lines of code:** ~1,350
- **Database models:** 2
- **Cron jobs:** 3
- **Supported languages:** 6
- **Categories:** 8

---

## Version 2.0.0-alpha (2024-02-08) - Modules Infrastructure

### 🎯 Major Features

#### Modules Architecture (V2)
- **Module Router** (`src/modules/router.ts`)
  - Intent analysis with language-specific Ollama models
  - Automatic module detection (21 modules supported)
  - Seamless integration with V1 AI race system
  - Module handler registry

- **Module Scheduler** (`src/modules/scheduler.ts`)
  - Cron job management for all modules
  - Support for reminders, subscriptions, birthdays, digests
  - Graceful shutdown handling

- **Module Types** (`src/modules/types.ts`)
  - Standardized interfaces for all modules
  - `ModuleName`, `ModuleAction`, `IntentAnalysis`
  - `ModuleResult`, `ModuleHandler` types

### 🗄️ Database

#### AIResponse Model
- Added `moduleUsed` field (String?, nullable)
- Added index on `moduleUsed` for analytics
- Migration: `add_modules_v2_infrastructure`

### 📦 Dependencies

#### New
- `node-cron@^3.0.3` - Scheduled tasks
- `@types/node-cron@^3.0.11` - TypeScript types

### 🔄 Changes

#### package.json
- Added `test` script (placeholder for module tests)
- Updated dependencies list

### 📚 Documentation

#### New Files
- `docs/MODULES_V2_INFRASTRUCTURE.md` - Complete V2 architecture guide

### ✅ Checklist

- [x] Infrastructure components created
- [x] Database schema updated
- [x] Migration applied
- [x] Dependencies installed
- [x] Documentation written
- [x] Wallet module (reference implementation)
- [ ] Remaining 20 modules
- [ ] Tests for each module

---

## Version 1.3.0 (2024-02-08) - Dynamic Ollama Models

### 🚀 Features

#### Language-Specific Ollama Models
- `qwen2.5:7b` for Russian, Uzbek, Arabic
- `llama3.1:8b` for English, Spanish
- `gemma2:9b` for Turkish
- `getModelForLanguage()` function for automatic selection
- `npm run ollama:install` script for easy setup

### 📚 Documentation
- `docs/OLLAMA_LANGUAGES.md` - Language-to-model mapping
- `docs/OLLAMA_SETUP.md` - Installation guide
- Updated `README.md` with multi-model setup

---

## Version 1.2.0 (2024-02-07) - Account Management

### 🚀 Features

#### Settings Improvements
- Simplified settings menu (4 sections: name, language, format, custom)
- Sequential preference editing (mirrors onboarding flow)
- Account deletion with confirmation

#### Bug Fixes
- Fixed custom prompt not saving in database
- Fixed onboarding flow after name entry
- Fixed "Done" button not completing onboarding
- Fixed TypeScript errors in settings handler

---

## Version 1.1.0 (2024-02-06) - Encryption

### 🔐 Security

#### AES-256-GCM Encryption
- `src/utils/encryption.ts` - Encryption utilities
- Auto-encrypt/decrypt in all database queries
- `ENCRYPTION_KEY` environment variable
- Migration script: `npm run db:encrypt`

#### Encrypted Fields
- User: `name`, `customPrompt`
- AIResponse: `userMessage`, `winnerResponse`

### 📚 Documentation
- `docs/ENCRYPTION.md` - Complete encryption guide
- `docs/ENCRYPTION_QUICKSTART.md` - Quick setup
- `docs/ENCRYPTION_IMPLEMENTATION_REPORT.md` - Technical details

---

## Version 1.0.0 (2024-02-05) - Initial Release

### 🎯 Core Features

#### Multi-AI Race System
- Parallel requests to 4 AI providers
- First response wins
- Support for GPT-4, Gemini, GigaChat, Claude

#### User Personalization
- 6 communication parameters (tone, length, emoji, structure, style, detail)
- Custom prompt support
- 6 languages (ru, en, es, uz, ar, tr)

#### Bot Commands
- `/start` - Onboarding (4 steps)
- `/settings` - Manage profile
- `/help` - Get help

#### Tech Stack
- Grammy (Telegram Bot Framework)
- Prisma ORM + PostgreSQL
- Ollama (local AI for system messages)
- TypeScript + strict typing

### 📦 Dependencies
- `grammy@^1.32.0`
- `@prisma/client@^5.22.0`
- `ollama@^0.5.11`
- `openai@^4.73.0`
- `@google/generative-ai@^0.21.0`
- `@anthropic-ai/sdk@^0.32.1`
- `axios@^1.13.5` (for GigaChat)
- `winston@^3.17.0` (logging)
- `zod@^3.24.1` (validation)

### 📚 Documentation
- `README.md` - Project overview
- `docs/AI_PROVIDERS_MANAGEMENT.md` - AI provider configuration

---

## Legend

- 🎯 Major Features
- 🚀 Features
- 🗄️ Database
- 🔐 Security
- 📦 Dependencies
- 🔄 Changes
- 🐛 Bug Fixes
- 📚 Documentation
- ✅ Checklist / Stats
