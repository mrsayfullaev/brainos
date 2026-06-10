# Мануал инженера BrainOS

Руководство по развёртыванию на новом сервере, настройке и поддержке бота.

---

## 1. Развёртывание на новом сервере

### 1.1. Структура доменов (на одном хосте)

- **sayfullaev.uz** — личный сайт; пока редирект на главную страницу бота (в будущем — свой сайт).
- **ai-khan.uz** — сайт проектов (разные прикольные проекты, в будущем — свои поддомены и структура); пока ведёт на главную страницу бота.
- **brainos.ai-khan.uz** — сайт конкретного проекта BrainOS: главная и подстраницы бота (OAuth, настройки и т.д.). В .env указывать BASE_URL именно с этим доменом.

### 1.2. Требования

- Ubuntu 22.04 / Debian 12, SSH, публичный IP, от 1 GB RAM.
- Node.js >= 18, PostgreSQL >= 14, (опционально) Redis, Nginx, Certbot, PM2.

### 1.3. Установка системы и сервисов

```bash
# Система
sudo apt update && sudo apt upgrade -y

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 14+
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE DATABASE brainos OWNER postgres;"
# Задать пароль при необходимости:
# sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'ваш_пароль';"

# Redis (рекомендуется)
sudo apt install -y redis-server

# Nginx и Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# PM2
sudo npm install -g pm2
```

В .env: `DATABASE_URL="postgresql://postgres:ваш_пароль@localhost:5432/brainos?schema=public"`.

### 1.4. Размещение приложения

```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www && git clone <URL_репозитория> brainos && cd brainos
npm install && cp .env.example .env
# Заполнить .env (см. раздел 2)
npm run prisma:generate && npm run prisma:migrate:deploy && npm run build
mkdir -p logs
pm2 start ecosystem.config.cjs --only brainos
pm2 save && pm2 startup
```

**Дашборд (опционально):** `cd apps/dashboard && npm install && npm run build`, затем из корня: `pm2 start ecosystem.config.cjs --only brainos-dashboard`. В ecosystem.config.cjs указан `cwd: '/var/www/brainos'`.

### 1.5. Домены, Nginx и SSL

- **DNS:** A-запись для каждого host на IP сервера: **brainos.ai-khan.uz**, **ai-khan.uz**, **sayfullaev.uz**, **sayfullaev.ru** (и при необходимости www для каждого).
- **Nginx:** для каждого host — файл в `/etc/nginx/sites-available/`, включить симлинк в `sites-enabled`, затем `nginx -t`, `systemctl reload nginx`.
- **SSL:** `sudo certbot --nginx -d <host>` для каждого домена. Готовые конфиги в `docs/`.

**Пошагово для brainos.ai-khan.uz (приложение на порту 3333):**

1. Временный конфиг для Certbot (HTTP 80):
   ```bash
   sudo cp /var/www/brainos/docs/nginx-brainos.ai-khan.uz-certbot-only.conf /etc/nginx/sites-available/brainos.ai-khan.uz
   sudo ln -sf /etc/nginx/sites-available/brainos.ai-khan.uz /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
2. Получить сертификат: `sudo certbot --nginx -d brainos.ai-khan.uz`
3. Финальный конфиг с HTTPS:
   ```bash
   sudo cp /var/www/brainos/docs/nginx-brainos.ai-khan.uz.conf /etc/nginx/sites-available/brainos.ai-khan.uz
   sudo nginx -t && sudo systemctl reload nginx
   ```

**Редиректы (выполнять из `/var/www/brainos`):**

- **ai-khan.uz** → brainos.ai-khan.uz:
  ```bash
  sudo cp /var/www/brainos/docs/nginx-ai-khan.uz-redirect.conf /etc/nginx/sites-available/ai-khan.uz
  sudo ln -sf /etc/nginx/sites-available/ai-khan.uz /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  sudo certbot --nginx -d ai-khan.uz -d www.ai-khan.uz
  ```

- **sayfullaev.uz** → brainos.ai-khan.uz:
  ```bash
  sudo cp /var/www/brainos/docs/nginx-sayfullaev.uz-redirect.conf /etc/nginx/sites-available/sayfullaev.uz
  sudo ln -sf /etc/nginx/sites-available/sayfullaev.uz /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  sudo certbot --nginx -d sayfullaev.uz -d www.sayfullaev.uz
  ```

- **sayfullaev.ru** → sayfullaev.uz:
  ```bash
  sudo cp /var/www/brainos/docs/nginx-sayfullaev.ru-redirect.conf /etc/nginx/sites-available/sayfullaev.ru
  sudo ln -sf /etc/nginx/sites-available/sayfullaev.ru /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  sudo certbot --nginx -d sayfullaev.ru -d www.sayfullaev.ru
  ```

Цепочка: sayfullaev.ru → sayfullaev.uz → brainos.ai-khan.uz. Если нужна главная без смены домена в адресной строке — вместо редиректа использовать `proxy_pass http://127.0.0.1:3333` с теми же заголовками, что в `nginx-brainos.ai-khan.uz.conf`.

### 1.6. Сеть

```bash
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

### 1.7. Проверка после развёртывания

```bash
curl https://brainos.ai-khan.uz/health
```

Открыть в браузере главную и картинки; проверить бота в Telegram. При ошибках — `pm2 logs brainos`.

---

## 2. Переменные окружения

### 2.1. Обязательные

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/brainos` |
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather | `123456:ABC-DEF...` |
| `OPENAI_API_KEY` | Ключ OpenAI | `sk-...` |
| `GIGACHAT_CLIENT_ID` | GigaChat OAuth Client ID | — |
| `GIGACHAT_CLIENT_SECRET` | GigaChat OAuth Client Secret | — |
| `ENCRYPTION_KEY` | Ключ AES-256-GCM (64 hex-символа) | см. раздел 8 |
| `BASE_URL` | Публичный URL бота (для OAuth и ссылок) | `https://brainos.ai-khan.uz` |

### 2.2. AI-провайдеры

| Переменная | Статус | Примечание |
|------------|--------|------------|
| `OPENAI_API_KEY` | Обязателен | GPT-4, парсеры, system LLM fallback |
| `GIGACHAT_CLIENT_ID` + `GIGACHAT_CLIENT_SECRET` | Обязателен | System LLM, парсинг. OAuth, не API key |
| `GEMINI_API_KEY` | Опционален | Закомментирован в race.ts |
| `CLAUDE_API_KEY` | Опционален | Закомментирован в race.ts |

### 2.3. Rate limiting

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `RATE_LIMIT_WINDOW_MS` | 60000 | Окно (мс) |
| `RATE_LIMIT_MAX_REQUESTS` | 20 | Макс. запросов в окне |

### 2.4. Платёжная система (Stripe)

| Переменная | Описание |
|------------|----------|
| `STRIPE_SECRET_KEY` | Секретный ключ Stripe |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (whsec_...) |
| `STRIPE_PRICE_PRO` | Price ID тарифа Pro |
| `STRIPE_PRICE_TEAM` | Price ID тарифа Team |
| `BOT_USERNAME` | Имя бота без @ (для success/cancel URL) |
| `WEBHOOK_PORT` или `STRIPE_WEBHOOK_PORT` | Порт HTTP (3333) |

### 2.5. OAuth-интеграции

| Интеграция | Переменные |
|------------|------------|
| Notion | `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, `NOTION_REDIRECT_URI` или `BASE_URL` |
| Gmail | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` |
| Google Calendar | `CALENDAR_CLIENT_ID`, `CALENDAR_CLIENT_SECRET`, `CALENDAR_REDIRECT_URI` |

`REDIRECT_URI` = `https://your-domain/auth/<notion|gmail|calendar>/callback`. Пошагово — раздел 3 ниже.

### 2.6. Прочее

| Переменная | Описание |
|------------|----------|
| `REDIS_URL` | Redis (кэш LLM, OAuth state, BullMQ). Опционально |
| `SENTRY_DSN` | Sentry для ошибок |
| `ANALYTICS_API_KEY` | Обязателен для GET /api/analytics/overview и /api/user/export; без него эндпоинты возвращают 403 |
| `DASHBOARD_ORIGIN` | CORS origin дашборда (напр. http://localhost:3001) |

**Как настроить (кратко):**

- **DASHBOARD_ORIGIN** — URL, с которого дашборд (apps/dashboard) ходит к API. Локально: `http://localhost:3001`. В проде: URL дашборда (например `https://brainos.ai-khan.uz` если дашборд на том же домене на порту 3001). Сервер отдаёт `Access-Control-Allow-Origin: <этот_origin>` только для этого значения.
- **ANALYTICS_API_KEY** — обязателен: без него эти эндпоинты всегда возвращают 403 «API key not configured». Запросы должны содержать заголовок `X-Api-Key: <значение_ANALYTICS_API_KEY>`. Сгенерировать: `openssl rand -hex 32`. **В дашборде** тот же ключ задаётся в `apps/dashboard/.env.local`: `NEXT_PUBLIC_ANALYTICS_API_KEY="<тот_же_ключ>"` (для прода — переменная окружения при сборке/запуске Next).
- **REDIS_URL** — строка подключения. Локально: `redis://localhost:6379`. С паролем: `redis://:пароль@host:6379`. Установка Redis: `sudo apt install redis-server`. Без Redis бот работает, но OAuth state в памяти (не для кластера), очереди BullMQ отключены.
- **SENTRY_DSN** — в [sentry.io](https://sentry.io) создать проект → Settings → Client Keys (DSN) → скопировать. Формат: `https://<key>@<org>.ingest.sentry.io/<project_id>`. После добавления в .env ошибки из бота будут уходить в Sentry.

---

## 3. Донастройка интеграций

**Общие требования:** HTTP-сервер бота должен быть доступен из интернета по HTTPS (раздел 1.5). В `.env` задаются переменные, после изменений — `pm2 restart brainos`.

Сообщения **«Интеграция Notion пока не настроена на сервере»** и **«Интеграция Gmail пока не настроена на сервере»** появляются, когда в окружении не заданы OAuth-переменные. Бот проверяет их при вызове `/notion` и `/inbox` и при отсутствии переменных выводит эту фразу вместо кнопки «Подключить».

### 3.1. Notion

1. **Интеграция в Notion:** [Notion Developers](https://www.notion.so/my-integrations) → **+ New integration** → название (например BrainOS), workspace. Включите нужные возможности (доступ к контенту). В разделе **Secrets** появятся **OAuth client ID** и **OAuth client secret** (Show → скопировать).
2. **OAuth Redirect URI:** в настройках интеграции (OAuth / публикация) укажите:
   - `https://ВАШ_ДОМЕН/auth/notion/callback`
   - Пример: `https://brainos.ai-khan.uz/auth/notion/callback`
   - Локальный тест: `http://localhost:3333/auth/notion/callback` (если Notion разрешает).
3. **Переменные в .env:**
   ```env
   NOTION_CLIENT_ID="ваш_oauth_client_id_из_notion"
   NOTION_CLIENT_SECRET="ваш_oauth_client_secret_из_notion"
   BASE_URL="https://brainos.ai-khan.uz"
   ```
   Опционально: `NOTION_REDIRECT_URI="https://brainos.ai-khan.uz/auth/notion/callback"` (если не задан, берётся из `BASE_URL`). Порт: `WEBHOOK_PORT` (по умолчанию 3333).
4. **Перезапуск:** `pm2 restart brainos`. После этого `/notion` должен показывать кнопку подключения.
5. В боте: `/notion` → авторизация → `/notion_link tasks <id>` и `/notion_link notes <id>` (id из URL базы Notion).

### 3.2. Gmail (Inbox)

1. **Google Cloud Console:** [console.cloud.google.com](https://console.cloud.google.com) → проект (или создайте новый) → **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**. При необходимости настройте **OAuth consent screen** (External для теста или Internal). Тип приложения: **Web application**.
2. **Authorized redirect URIs:** добавьте `https://ВАШ_ДОМЕН/auth/gmail/callback`, например `https://brainos.ai-khan.uz/auth/gmail/callback`. Локальный тест: `http://localhost:3333/auth/gmail/callback`. Создайте клиент, скопируйте Client ID и Client Secret.
3. **Включите Gmail API:** **APIs & Services** → **Library** → Gmail API → **Enable**.
4. **Переменные в .env:**
   ```env
   GMAIL_CLIENT_ID="ваш_client_id_из_google"
   GMAIL_CLIENT_SECRET="ваш_client_secret_из_google"
   BASE_URL="https://brainos.ai-khan.uz"
   ```
   Опционально: `GMAIL_REDIRECT_URI="https://brainos.ai-khan.uz/auth/gmail/callback"`.
5. **Перезапуск:** `pm2 restart brainos`. После этого `/inbox` должен предлагать подключение Gmail.

### 3.3. Google Calendar (Meeting)

1. В том же проекте Google Cloud: Enable Google Calendar API. OAuth consent + OAuth 2.0 Client. Redirect: `https://your-domain/auth/calendar/callback`.
2. В `.env`: `CALENDAR_CLIENT_ID`, `CALENDAR_CLIENT_SECRET`, `CALENDAR_REDIRECT_URI`.
3. Подключение: в браузере открыть `https://your-domain/auth/calendar?userId=<cuid>` (userId — из БД).

### 3.4. Сводка OAuth (Notion и Gmail)

| Интеграция | Обязательные переменные | Redirect URI (указать в сервисе и при необходимости в .env) |
|------------|--------------------------|--------------------------------------------------------------|
| Notion     | `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` | `{BASE_URL}/auth/notion/callback` |
| Gmail      | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`   | `{BASE_URL}/auth/gmail/callback` |

Если задан **BASE_URL** (например `https://brainos.ai-khan.uz`), по умолчанию используются эти callback. Убедитесь, что домен в BASE_URL доступен по HTTPS (раздел 1.5), Nginx проксирует на порт 3333, и в панелях Notion/Google указан тот же домен и путь.

---

## 4. База данных

```bash
# Применить миграции (prod)
npm run prisma:migrate:deploy

# Разработка: создать миграцию
npx prisma migrate dev --name add_new_field

# Prisma Studio
npm run prisma:studio
# http://localhost:5555

# Бэкап
pg_dump -U user brainos > backup_$(date +%Y%m%d).sql
```

---

## 5. Redis (опционально)

Нужен для кэша system LLM, OAuth state, BullMQ.

```bash
sudo apt install redis-server
redis-cli ping  # PONG
# В .env: REDIS_URL="redis://localhost:6379"
```

Без Redis бот работает, но без кэша LLM и без очередей.

---

## 6. Логи и мониторинг

| Файл | Назначение |
|------|------------|
| `logs/combined.log` | Все логи |
| `logs/error.log` | Ошибки |
| `logs/exceptions.log` | Непойманные исключения |
| `logs/rejections.log` | Unhandled promise rejections |

```bash
tail -f logs/combined.log
pm2 logs brainos
```

`SENTRY_DSN` в `.env` — отправка ошибок в Sentry.

**Health check:** `curl http://localhost:3333/health` → `200 {"status":"ok","db":"connected"}`.

---

## 7. HTTP-сервер и порты

Порт по умолчанию **3333**. Эндпоинты:

| Путь | Метод | Назначение |
|------|-------|------------|
| `/health` | GET | Проверка живости |
| `/api/analytics/overview` | GET | Аналитика |
| `/api/user/export` | GET | Экспорт данных (GDPR) |
| `/api/auth/telegram` | POST | Telegram Login (дашборд) |
| `/auth/notion/callback` | GET | OAuth Notion |
| `/auth/gmail/callback` | GET | OAuth Gmail |
| `/auth/calendar` | GET | Редирект на Google |
| `/auth/calendar/callback` | GET | OAuth Calendar |
| `/webhooks/stripe` | POST | Stripe webhook |

Production: Nginx (или аналог) как reverse proxy, HTTPS, proxy_pass на localhost:3333.

---

## 8. Шифрование данных

Ключ `ENCRYPTION_KEY` — 32 байта в hex (64 символа):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Хранить в secrets manager, не коммитить. Ротация — см. **docs/ENCRYPTION.md**.

---

## 9. Типичные проблемы

- **Бот не отвечает:** логи `tail -f logs/combined.log` или `pm2 logs brainos`; проверить `TELEGRAM_BOT_TOKEN` и БД (`npm run prisma:studio`).
- **GigaChat: self-signed certificate:** в `src/ai/providers/gigachat.ts` используется `rejectUnauthorized: false` (по согласованию при корпоративном прокси/VPN).
- **OpenAI 403 Country not supported:** бот продолжит работать через GigaChat и другие провайдеры.
- **Stripe webhook не срабатывает:** URL доступен по HTTPS; `STRIPE_WEBHOOK_SECRET` совпадает с Dashboard; подписка продлевается через `customer.subscription.updated`.
- **node-cron: "missed execution":** при высокой нагрузке (долгие AI-запросы, блокирующий I/O) event loop занят, и cron может пропустить выполнение. Это предупреждение, не критичная ошибка. При частых пропусках — рассмотреть вынос тяжёлых cron в отдельный процесс.

---

## 10. Полезные команды

```bash
npm run build            # Сборка
npm run dev               # Dev с hot reload
npm run lint              # ESLint
npm run format            # Prettier
npm run prisma:generate   # Prisma Client
npm run prisma:migrate    # Миграции (dev)
npm run prisma:migrate:deploy  # Миграции (prod)
npm run prisma:studio     # Prisma Studio
pm2 start ecosystem.config.cjs
pm2 logs brainos
pm2 restart brainos
pm2 status
```

---

## Связанные документы

- **docs/API.md** — эндпоинты HTTP
- **docs/VERSIONING.md** — правила версионирования (MAJOR.MINOR.PATCH)
- **docs/ENCRYPTION.md** — шифрование и ротация ключа
- **docs/THIRD_PARTY_APIS.md** — данные, передаваемые в сторонние API
- **docs/PUBLIC_PAGES_PLAN.md** — план публичных страниц (оферта, политика, об авторе)
- **.env.example** — все переменные окружения
