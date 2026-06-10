# BrainOS - Multi-AI Telegram Bot 🤖

Персонализированный Telegram-бот, который отправляет запросы пользователя **параллельно нескольким AI** (GPT-4, Gemini, GigaChat, Claude) и возвращает **первый полученный ответ**. Все остальные ответы логируются для аналитики.

## ✨ Возможности

- 🏁 **Race Condition**: Параллельные запросы к AI моделям
- 🎯 **Персонализация**: 6 параметров настройки общения + свободный промпт
- 🌍 **Мультиязычность**: Русский, English, Español, O'zbek, العربية, Türkçe
- 🤖 **Ollama Integration**: Локальные AI для системных сообщений
- 🔐 **Шифрование данных**: AES-256-GCM для защиты конфиденциальных данных
- 📊 **Аналитика**: Сохранение всех ответов в PostgreSQL
- ⚡ **Rate Limiting**: Защита от спама

### Активные AI провайдеры:
- ✅ **OpenAI GPT-4** - лучшее качество ответов
- ⚠️ **Google Gemini** - отключён (не работает с AI Studio API в РФ)
- ✅ **GigaChat** - работает с автоматическим OAuth
- ⚠️ **Claude Sonnet** - отключён (нужен API ключ)

> 📝 **GigaChat**: Добавьте `GIGACHAT_CLIENT_ID` и `GIGACHAT_CLIENT_SECRET` в `.env`: [`docs/GIGACHAT_CLIENT_SETUP.md`](docs/GIGACHAT_CLIENT_SETUP.md)

## 🛠 Технологии

- **TypeScript** - строгая типизация
- **Grammy** - Telegram Bot Framework
- **Prisma ORM** - работа с PostgreSQL
- **Ollama** - локальные AI (Llama 3.2 3B, Qwen 2.5 3B)
- **AI Providers**: OpenAI GPT-4, Google Gemini, GigaChat, Claude

## 📋 Требования

- Node.js >= 18
- PostgreSQL >= 14
- Ollama (опционально, для локальных AI)
- API ключи для AI провайдеров

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
cd BrainOS
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/brainos"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your_bot_token_here"

# AI Providers
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="..."
GIGACHAT_API_KEY="..."
CLAUDE_API_KEY="..."

# Ollama (локальный)
OLLAMA_BASE_URL="http://localhost:11434"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="20"

# Encryption (AES-256-GCM)
ENCRYPTION_KEY="..." # Сгенерируйте: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> 📖 Подробные инструкции по получению API ключей: [`docs/API_KEYS.md`](docs/API_KEYS.md)  
> 🔐 Настройка шифрования: [`docs/ENCRYPTION.md`](docs/ENCRYPTION.md)

### 3. Создание Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен в `.env`

### 4. Настройка базы данных

```bash
# Запустить миграции
npm run prisma:migrate

# Открыть Prisma Studio (опционально)
npm run prisma:studio
```

### 5. Установка Ollama (опционально)

Для локальных AI скачайте [Ollama](https://ollama.ai) и установите модели:

#### Автоматическая установка (рекомендуется):
```bash
npm run ollama:install
```

Установит оптимальные модели для всех 6 языков (~15 GB):
- `qwen2.5:7b` - для русского, узбекского, арабского
- `llama3.1:8b` - для английского, испанского
- `gemma2:9b` - для турецкого

#### Ручная установка:
```bash
ollama pull qwen2.5:7b
ollama pull llama3.1:8b
ollama pull gemma2:9b
```

> 📖 Подробнее о моделях: [`docs/OLLAMA_MODELS.md`](docs/OLLAMA_MODELS.md) и [`docs/OLLAMA_LANGUAGES.md`](docs/OLLAMA_LANGUAGES.md)

### 6. Запуск бота

```bash
# Development mode (с hot reload)
npm run dev

# Production build
npm run build
npm start
```

---

## 📖 Документация

Вся документация находится в папке [`docs/`](docs/):

- 📘 **[Быстрая настройка](docs/SETUP.md)** - пошаговая установка
- 🔑 **[Получение API ключей](docs/API_KEYS.md)** - инструкции для всех провайдеров
- 🔐 **[Шифрование данных](docs/ENCRYPTION.md)** - настройка AES-256-GCM
- ✅ **[Чек-лист запуска](docs/CHECKLIST.md)** - проверка корректной установки
- ❓ **[FAQ](docs/FAQ.md)** - часто задаваемые вопросы
- 🤖 **[Управление AI провайдерами](docs/AI_PROVIDERS_MANAGEMENT.md)** - включение/отключение AI
- 🇷🇺 **[Настройка GigaChat](docs/GIGACHAT_SETUP.md)** - полная инструкция
- 🗑️ **[Очистка БД](docs/DB_CLEAR_GUIDE.md)** - скрипты очистки базы данных
- 🤝 **[Contributing](docs/CONTRIBUTING.md)** - гайд для разработчиков
- 📝 **[Changelog](docs/CHANGELOG.md)** - история версий
- 🔢 **[Версионирование](docs/VERSIONING.md)** - правила MAJOR.MINOR.PATCH
- 📊 **[Project Summary](docs/PROJECT_SUMMARY.md)** - итоговое описание
- 📋 **[V4 Implementation Summary](docs/V4_IMPLEMENTATION_SUMMARY.md)** - итог реализации V4
- 📐 **[V4 Enterprise Spec](docs/V4_ENTERPRISE_SPEC.md)** - чеклист и оценки
- 🔌 **[API (V4)](docs/API.md)** - эндпоинты: health, analytics, auth/telegram, OAuth callbacks, Stripe, порты
- 🔍 **[Critical Analysis Report](docs/CRITICAL_ANALYSIS_REPORT.md)** - аудит кода, БД, безопасности, производительности и рекомендации

## 🏥 Мониторинг и инфра (V4)

При запуске поднимается HTTP-сервер (порт по умолчанию **3333**, см. `WEBHOOK_PORT` в `.env.example`):

- **GET /health** — проверка живости и БД. Ответ: `200` + `{"status":"ok","db":"connected"}` или `503` при ошибке БД.
- **GET /api/analytics/overview?userId=...** — сводка по пользователю (wallet за месяц, задачи, привычки, health). Опционально заголовок `X-Api-Key` (см. `ANALYTICS_API_KEY`).
- **POST /api/auth/telegram** — проверка подписи Telegram Login (для веб-дашборда). Тело: JSON от виджета (id, hash, auth_date, …).

Остальные маршруты: Stripe webhook, OAuth (Notion, Gmail, Google Calendar) — при соответствующей настройке (см. `.env.example` и `docs/V4_IMPLEMENTATION_SUMMARY.md`).

Опционально: **Redis** (`REDIS_URL`) — кэш, OAuth state, BullMQ для очередей; **Sentry** (`SENTRY_DSN`) — сбор ошибок; **дашборд** — приложение в `apps/dashboard` (Next.js, графики, вход через Telegram). Запуск на том же сервере: в `ecosystem.config.cjs` добавлен процесс `brainos-dashboard` (порт 3001). Сборка: `cd apps/dashboard && npm install && npm run build`; затем `pm2 start ecosystem.config.cjs --only brainos-dashboard` или вместе с ботом. В бэкенде задать `DASHBOARD_ORIGIN` (URL, с которого открывается дашборд), в дашборде в `.env.local` — `NEXT_PUBLIC_API_URL` и `NEXT_PUBLIC_TELEGRAM_BOT_NAME`.

## 📖 Использование

### Команды бота

- `/start` - Начать работу / онбординг
- `/settings` - Просмотр и изменение настроек
- `/help` - Справка
- `/premium` - Тариф и оплата (Stripe)
- `/notion` - Подключить Notion
- `/notion_link tasks <id>` | `/notion_link notes <id>` - Привязать базу Notion (id из URL базы)
- `/inbox` - Inbox Gmail (триаж)
- `/research` - Исследование по запросу

### Поток онбординга

1. **Приветствие** (генерируется через Ollama)
2. **Ввод имени**
3. **Выбор языка** (6 языков)
4. **Настройка формата общения** (6 параметров):
   - Тон (официально/дружески/нейтрально)
   - Длина ответов (кратко/средне/подробно)
   - Эмодзи (да/нет/умеренно)
   - Структура (списки/параграфы/комбинированно)
   - Стиль (эксперт/друг/учитель)
   - Детализация (только ответ/с контекстом/максимально)
5. **Кастомные инструкции** (опционально)

### Как работает Race Logic

```typescript
// Пользователь пишет сообщение
User: "Объясни квантовую запутанность"

// Бот запускает 3 AI параллельно
→ GPT-4              (время: 2.1s) ❌
→ Gemini 1.5 Flash   (время: 1.3s) ✅ ПОБЕДИТЕЛЬ
→ GigaChat           (время: 3.2s) ❌

// Пользователь получает первый ответ
Bot: "Квантовая запутанность — это когда две частицы..."
     — gemini-1.5-flash

// Все ответы сохраняются в БД для аналитики
```

## 📊 База данных

### Модель User

```prisma
model User {
  id           String   @id @default(cuid())
  telegramId   BigInt   @unique
  name         String?
  language     String   // "ru" | "en" | "es" | "ar" | "uz" | "tr"
  
  // Настройки формата общения
  tone         String?
  length       String?
  emoji        String?
  structure    String?
  style        String?
  detail       String?
  customPrompt String?  @db.Text
  
  responses    AIResponse[]
}
```

### Модель AIResponse

```prisma
model AIResponse {
  id             String   @id
  userId         String
  userMessage    String   @db.Text
  
  winnerModel    String   // Победитель race
  winnerResponse String   @db.Text
  winnerTime     Int      // Время ответа (мс)
  
  allResponses   Json     // Все ответы для аналитики
}
```

## 🔧 Разработка

### Структура проекта

```
src/
├── bot/
│   ├── index.ts              # Инициализация Grammy
│   ├── handlers/
│   │   ├── start.ts          # /start + онбординг
│   │   ├── settings.ts       # /settings
│   │   ├── help.ts           # /help
│   │   └── message.ts        # Обработка сообщений
│   └── middleware/
│       ├── auth.ts           # Загрузка пользователя из БД
│       └── language.ts       # Установка языка
├── ai/
│   ├── ollama.ts             # Локальные модели
│   ├── race.ts               # Race logic
│   └── providers/
│       ├── openai.ts         # OpenAI GPT-4
│       ├── gemini.ts         # Google Gemini
│       ├── gigachat.ts       # GigaChat
│       └── claude.ts         # Anthropic Claude
├── database/
│   ├── client.ts             # Prisma Client
│   └── queries/
│       ├── user.ts           # CRUD для User
│       └── response.ts       # CRUD для AIResponse
├── localization/
│   ├── index.ts              # i18n загрузчик
│   └── translations/         # 6 языков (JSON)
├── utils/
│   ├── logger.ts             # Winston logger
│   └── config.ts             # Env validation (Zod)
└── index.ts                  # Entry point
```

### Скрипты

```bash
npm run dev              # Development mode с hot reload
npm run build            # Production build
npm start                # Запуск production версии
npm run lint             # ESLint проверка
npm run format           # Prettier форматирование
npm run prisma:generate  # Генерация Prisma Client
npm run prisma:migrate   # Запуск миграций
npm run prisma:studio    # Открыть Prisma Studio
npm run db:clear         # Очистка БД (с подтверждением)
npm run db:clear-force   # Очистка БД (без подтверждения)
npm run test:openai      # Проверка OpenAI GPT (ChatGPT)
```

> 📖 Подробнее об очистке БД: [`docs/DB_CLEAR_GUIDE.md`](docs/DB_CLEAR_GUIDE.md)

**Проверка ChatGPT (OpenAI):** `npm run test:openai` — проверяет, что `OPENAI_API_KEY` валиден и API отвечает.

## 📈 Мониторинг и логи

Логи записываются в папку `logs/`:

- `combined.log` - все логи
- `error.log` - только ошибки
- `exceptions.log` - необработанные исключения
- `rejections.log` - unhandled promise rejections

Уровни логирования: `error`, `warn`, `info`, `debug`

## 🔐 Безопасность

- ✅ API ключи только в `.env` (не коммитятся в Git)
- ✅ Валидация env переменных через Zod
- ✅ Rate limiting (20 запросов/минута)
- ✅ SQL injection защита (через Prisma)
- ✅ Таймауты для AI провайдеров (15 секунд)

## 📘 V4 (Enterprise)

Реализовано: биллинг (Stripe), Meeting Agent (преп к встречам), Workflow Engine, Research Agent, Smart Notifications, AI Predictions, Voice (Whisper), Team Workspaces, Notion Integration, Email Agent (Gmail OAuth + триаж). Сводка и чеклист — в **`docs/V4_IMPLEMENTATION_SUMMARY.md`** и **`docs/V4_ENTERPRISE_SPEC.md`**. Переменные окружения для V4 — в `.env.example` (Stripe, Notion, Gmail, WEBHOOK_PORT).

## 🚧 Roadmap (дальше)

- [ ] Analytics Dashboard (Next.js, графики)
- [ ] Redis, job queue, расширенный мониторинг

## 📝 Лицензия

ISC

## 👨‍💻 Автор

Разработано для проекта BrainOS

---

**Готов к работе! 🚀**

Если возникли вопросы, проверьте документацию в папке [`docs/`](docs/).
