# API и HTTP-эндпоинты (V4)

HTTP-сервер запускается вместе с ботом. Порт: **WEBHOOK_PORT** (или STRIPE_WEBHOOK_PORT и т.д.), по умолчанию **3333**. Базовый URL: `https://your-domain.com` или `http://localhost:3333`.

---

## Health check

**GET /health**

Ответ: `application/json`. 200 — `{"status":"ok","db":"connected"}`. 503 — при ошибке БД `{"status":"degraded","db":"error"}`.

---

## Analytics

**GET /api/analytics/overview**

Сводка по пользователю (wallet за месяц, задачи, привычки, здоровье).

- **userId**: query `?userId=<cuid>` или заголовок `X-User-Id`.
- Если задан **ANALYTICS_API_KEY**, обязателен заголовок **X-Api-Key** с тем же значением (иначе 403).

Ответ 200 — JSON: `userId`, `wallet` (income, expenses, balance, period), `tasks` (total, todo, inProgress, done), `habits` (total, active, completionsThisMonth), `health` (entriesCount).

Ошибки: 400 (нет userId), 403 (API key), 404 (пользователь не найден), 500.

**CORS:** разрешён Origin из **DASHBOARD_ORIGIN** (по умолчанию http://localhost:3001).

---

## Экспорт данных пользователя (GDPR)

**GET /api/user/export**

Экспорт всех данных пользователя в JSON (Right to Data Portability).

- **userId**: query `?userId=<cuid>` или заголовок `X-User-Id`.
- Если задан **ANALYTICS_API_KEY**, обязателен заголовок **X-Api-Key** с тем же значением (иначе 403).

Ответ 200 — `application/json`, заголовок `Content-Disposition: attachment` для скачивания файла. В JSON — все данные пользователя из всех таблиц (расшифрованные). Ошибки: 400 (нет userId), 403 (API key), 404 (пользователь не найден), 500.

**CORS:** как у analytics. Также доступно из бота: Настройки → «Экспорт данных».

---

## Telegram Login (для дашборда)

**POST /api/auth/telegram**

Тело: `application/json` — объект от Telegram Login Widget (строки): `id`, `hash`, `auth_date` обязательны.

Ответ 200 — `{"userId":"<cuid>"}`. Ошибки: 400, 401 (неверная подпись), 404 (пользователь не в БД), 501 (нет TELEGRAM_BOT_TOKEN), 500.

CORS: как у analytics.

---

## OAuth callbacks

Все — **GET**, ответ — **text/html**.

| Путь | Описание |
|------|----------|
| `/auth/notion/callback` | Notion. Query: code, state. Нужны NOTION_CLIENT_ID, NOTION_CLIENT_SECRET. Redirect URI: NOTION_REDIRECT_URI или BASE_URL + /auth/notion/callback |
| `/auth/gmail/callback` | Gmail. Query: code, state. Нужны GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET. Redirect URI: GMAIL_REDIRECT_URI или BASE_URL + /auth/gmail/callback |
| `/auth/calendar` | Редирект на Google. Обязательный query: **userId** (cuid). Без userId — 400 |
| `/auth/calendar/callback` | Google Calendar. Query: code, state. Нужны CALENDAR_CLIENT_ID, CALENDAR_CLIENT_SECRET. Redirect URI: CALENDAR_REDIRECT_URI или BASE_URL + /auth/calendar/callback |

---

## Stripe webhook

**POST /webhooks/stripe**

Заголовок **Stripe-Signature**, тело — сырой payload Stripe. Работает при заданном **STRIPE_WEBHOOK_SECRET**.

---

## Сводка путей и порт

| Путь | Метод |
|------|--------|
| /health | GET |
| /api/analytics/overview | GET |
| /api/user/export | GET |
| /api/auth/telegram | POST |
| /auth/notion/callback | GET |
| /auth/gmail/callback | GET |
| /auth/calendar | GET |
| /auth/calendar/callback | GET |
| /webhooks/stripe | POST |

Порт по умолчанию: **3333** (см. .env.example).
