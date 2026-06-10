# Modules V2 - Quick Start

## 🚀 Быстрый старт для разработчиков

### Текущий статус

✅ **Инфраструктура V2 готова** (2024-02-08)

- [x] Module Router - роутинг и intent analysis
- [x] Module Scheduler - cron jobs
- [x] Module Types - общие типы
- [x] Database Migration - добавлено поле `moduleUsed`
- [x] Dependencies - установлен `node-cron`
- [ ] **Next:** Wallet Module (reference implementation)

### Структура проекта

```
src/modules/
├── index.ts              # Entry point - импортирует все модули
├── types.ts              # Общие типы для всех модулей
├── router.ts             # Intent analysis + routing
├── scheduler.ts          # Cron jobs manager
│
└── {module_name}/        # Каждый модуль (21 штука)
    ├── schema.prisma     # Модели БД (мержится в главную схему)
    ├── types.ts          # Типы модуля
    ├── parser.ts         # NLP парсинг (GigaChat → OpenAI)
    ├── queries.ts        # CRUD с шифрованием
    ├── handlers.ts       # Бизнес-логика
    ├── prompts.ts        # Шаблоны промптов для AI
    ├── analytics.ts      # Аналитика (опционально)
    ├── cron.ts           # Scheduled tasks (опционально)
    └── index.ts          # Экспорты + регистрация
```

## 📋 Список модулей (21 штука)

### Phase 1 - Core (приоритет)
- [ ] `wallet` - Финансы (доходы/расходы) ⭐ **Reference implementation**
- [ ] `task` - Задачи (с подзадачами)
- [ ] `remind` - Напоминания (cron)

### Phase 2 - Simple Trackers
- [ ] `note` - Заметки (с голосом)
- [ ] `sleep` - Сон
- [ ] `water` - Вода
- [ ] `idea` - Идеи
- [ ] `quote` - Цитаты

### Phase 3 - Health & Learning
- [ ] `health` - Здоровье
- [ ] `workout` - Тренировки
- [ ] `food` - Питание
- [ ] `vocab` - Словарь (spaced repetition)
- [ ] `book` - Книги

### Phase 4 - Finance & Social
- [ ] `sub` - Подписки (cron reminders)
- [ ] `savings` - Накопления (цели)
- [ ] `debt` - Долги
- [ ] `contact` - Контакты (CRM + birthdays)

### Phase 5 - Content & Travel
- [ ] `news` - Новости (RSS + AI summaries)
- [ ] `trip` - Поездки
- [ ] `place` - Места (wishlist)
- [ ] `buy` - Покупки (списки + трекинг)

## 🛠️ Как создать новый модуль

### Шаг 1: Создать директорию

```bash
mkdir -p src/modules/wallet
cd src/modules/wallet
```

### Шаг 2: Создать файлы

**Минимальный набор файлов:**
1. `types.ts` - интерфейсы
2. `parser.ts` - парсинг с system LLM (GigaChat → OpenAI)
3. `queries.ts` - CRUD с шифрованием
4. `handlers.ts` - бизнес-логика
5. `index.ts` - регистрация модуля

**Опционально:**
- `prompts.ts` - если нужны сложные промпты
- `analytics.ts` - если есть аналитика
- `cron.ts` - если нужны scheduled tasks

### Шаг 3: Шаблон handler

```typescript
// src/modules/wallet/handlers.ts
import type { Context } from 'grammy';
import type { User } from '@prisma/client';
import type { ModuleResult } from '@/modules/types';

export async function handleWalletMessage(
  ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  // 1. Parse input (with system LLM)
  const parsed = await parseTransaction(message, user.language);
  
  // 2. Save to DB (auto-encrypted)
  const data = await createTransaction({ userId: user.id, ...parsed });
  
  // 3. Get context for AI
  const recentData = await getTransactions(user.id, 5);
  
  // 4. Build prompt for AI
  const modulePrompt = `
You are helping with expense tracking.
User added: ${parsed.type} ${parsed.amount} RUB.
Recent: ${recentData.map(d => `${d.amount}`).join(', ')}
Confirm in ${user.language}.
  `;
  
  return { modulePrompt, data };
}
```

### Шаг 4: Регистрация

```typescript
// src/modules/wallet/index.ts
import { registerModuleHandler } from '@/modules/router';
import { handleWalletMessage } from './handlers';

// Auto-register when imported
registerModuleHandler('wallet', handleWalletMessage);

export * from './types';
export * from './handlers';
```

### Шаг 5: Импорт в главный файл

```typescript
// src/modules/index.ts
import './wallet'; // Регистрируется автоматически
```

### Шаг 6: Prisma Schema

Добавить модели в `prisma/schema.prisma`:

```prisma
model Transaction {
  id          String   @id @default(cuid())
  userId      String
  amount      Decimal  @db.Decimal(10, 2)
  description String?  // ENCRYPTED
  date        DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, date])
}
```

### Шаг 7: Migration

```bash
npx prisma migrate dev --name add_wallet_module
```

## 🔐 Правила шифрования

### ✅ Шифровать
- Пользовательский текст (описания, заметки, имена)
- Адреса, локации
- Личную информацию

### ❌ НЕ шифровать
- Числа, суммы
- Даты, timestamp
- Enum, boolean
- ID, references

### Пример

```typescript
// queries.ts
import { encrypt, decrypt } from '@/utils/encryption';

export async function createTransaction(data: TransactionInput) {
  return prisma.transaction.create({
    data: {
      amount: data.amount,              // NOT encrypted
      description: encrypt(data.description), // ENCRYPTED
      date: new Date(),                 // NOT encrypted
    }
  });
}

export async function getTransactions(userId: string) {
  const txs = await prisma.transaction.findMany({ where: { userId } });
  return txs.map(tx => ({
    ...tx,
    description: decrypt(tx.description), // DECRYPTED on read
  }));
}
```

## 🧪 Тестирование

### Unit Tests

```typescript
// src/modules/wallet/__tests__/parser.test.ts
import { parseTransaction } from '../parser';

describe('Wallet Parser', () => {
  it('should parse expense', async () => {
    const result = await parseTransaction('кофе 290', 'ru');
    expect(result.type).toBe('EXPENSE');
    expect(result.amount).toBe(290);
  });
});
```

### Integration Tests

```typescript
// src/modules/wallet/__tests__/integration.test.ts
import { handleWalletMessage } from '../handlers';

describe('Wallet Integration', () => {
  it('should create transaction and return AI prompt', async () => {
    const result = await handleWalletMessage(ctx, user, 'кофе 290');
    expect(result.modulePrompt).toContain('expense tracking');
    expect(result.data).toBeDefined();
  });
});
```

## 📊 Аналитика

### Статистика по модулям

```typescript
// Сколько раз каждый модуль использовался
const stats = await prisma.aIResponse.groupBy({
  by: ['moduleUsed'],
  _count: { moduleUsed: true },
  where: { moduleUsed: { not: null } },
});

// Result:
// [
//   { moduleUsed: 'wallet', _count: { moduleUsed: 120 } },
//   { moduleUsed: 'task', _count: { moduleUsed: 85 } },
// ]
```

## 🎓 Полезные ссылки

### Документация V2
- `docs/MODULES_V2_INFRASTRUCTURE.md` - Полная архитектура
- `docs/CHANGELOG.md` - История изменений

### Документация V1 (reference)
- `docs/ENCRYPTION.md` - Как работает шифрование
- `src/ai/system-llm.ts` - системный LLM (GigaChat → OpenAI)
- `src/ai/system-messages.ts` - приветствия и справка
- `src/ai/race.ts` - Multi-AI race system

### System Prompt
- См. оригинальный V2 system prompt в начале разговора

## ❓ FAQ

### Q: Нужно ли изменять V1 код?
A: Нет, V2 полностью обратно совместима. Изменения только в новых файлах.

### Q: Как добавить cron job для модуля?
A: 
1. Создай `src/modules/{module}/cron.ts`
2. Экспортируй функцию (например, `checkReminders()`)
3. Импортируй в `src/modules/scheduler.ts`
4. Добавь `cron.schedule('* * * * *', checkReminders)`

### Q: Модуль не определяется, что делать?
A: Проверь:
1. Модуль зарегистрирован в `router.ts`?
2. Имя модуля в `ModuleName` type?
3. System LLM правильно парсит intent?
4. Confidence > 70?

### Q: Как отладить intent analysis?
A: Включи debug логи:
```typescript
logger.debug(`Intent: ${JSON.stringify(intent)}`);
```

## 🚦 Следующие шаги

1. ✅ Инфраструктура создана
2. **🔨 Сейчас:** Wallet Module (reference implementation)
3. Tasks + Reminders (cron jobs)
4. Остальные 18 модулей

---

**Ready to build!** 🚀
