# Данные, передаваемые в сторонние API

Для соответствия GDPR и прозрачности ниже перечислены сервисы, куда BrainOS передаёт данные пользователя, и какие именно данные.

## OpenAI

**Когда используется:** системный LLM (fallback при падении GigaChat), Whisper (распознавание голоса), Embeddings (база знаний), race (мультимодельный ответ).

**Что передаётся:**
- **Chat Completions (GPT-4):** system prompt + user message — текст запроса пользователя и системные инструкции (язык, формат).
- **Whisper:** аудиофайл голосового сообщения (сырые байты).
- **Embeddings:** текст страниц базы знаний для создания векторных представлений.

**Где в коде:** `src/ai/providers/openai.ts`, `src/ai/system-llm.ts`, `src/modules/voice/transcribe.ts`, `src/modules/kb/embeddings.ts`, `src/ai/race.ts`.

---

## GigaChat (Сбер)

**Когда используется:** системный LLM (по умолчанию), race, роутер намерений, парсеры (кошелёк, задачи, напоминания), приветствия, help.

**Что передаётся:**
- system prompt + user message — текст запроса пользователя и системные инструкции.
- Примеры: «Проанализируй сообщение и определи модуль», «Распарси транзакцию», «Сгенерируй приветствие».

**Где в коде:** `src/ai/providers/gigachat.ts`, `src/ai/system-llm.ts`, `src/ai/race.ts`, `src/modules/router.ts`, `src/modules/wallet/parser.ts`, `src/modules/task/parser.ts`, `src/modules/remind/parser.ts`, `src/ai/system-messages.ts`.

---

## Notion

**Когда используется:** синхронизация задач и заметок (BrainOS ↔ Notion) при подключении пользователем.

**Что передаётся:**
- **В Notion (создание страниц):** заголовок задачи/заметки, статус, содержимое — расшифрованные данные из БД BrainOS.
- **Из Notion (чтение):** запрос списка страниц базы — OAuth access token пользователя.
- OAuth: `userId` в state для callback.

**Где в коде:** `src/modules/notion/sync.ts`, `src/modules/notion/notion-api.ts`, `src/modules/notion/oauth.ts`.

---

## Google (Gmail)

**Когда используется:** загрузка inbox при подключении Gmail.

**Что передаётся:**
- OAuth: `userId` в state для callback.
- Gmail API: запрос метаданных писем (subject, from, snippet) — данные приходят из Gmail, не отправляются.
- Триаж писем: subject + snippet → system LLM (GigaChat/OpenAI) для классификации (срочно/важно/спам).

**Где в коде:** `src/modules/inbox/oauth.ts`, `src/modules/inbox/gmail-api.ts`, `src/modules/inbox/fetch.ts`, `src/modules/inbox/triage.ts`.

---

## Google Calendar

**Когда используется:** синхронизация событий календаря при подключении.

**Что передаётся:**
- OAuth: `userId` в state для callback.
- Calendar API: запрос событий в диапазоне дат — данные приходят из Google, не отправляются.
- Подготовка к встрече: title, participants, agenda → system LLM для генерации пунктов повестки.

**Где в коде:** `src/modules/meeting/calendar-oauth.ts`, `src/modules/meeting/calendar-api.ts`, `src/modules/meeting/sync-calendar.ts`, `src/modules/meeting/cron.ts`.

---

## Резюме

| Сервис | Данные |
|--------|--------|
| **OpenAI** | Текст запросов, аудио (Whisper), текст для embeddings |
| **GigaChat** | Текст запросов и системных промптов |
| **Notion** | Задачи и заметки (при синхронизации) |
| **Gmail** | Subject + snippet писем (для триажа через LLM) |
| **Google Calendar** | Title, participants, agenda (для подготовки к встрече через LLM) |

**Рекомендация для политики конфиденциальности:** указать перечисленные сервисы, цели обработки (AI-ответы, синхронизация, распознавание голоса) и получить согласие пользователя при первом использовании или в настройках.
