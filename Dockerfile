# ─── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Зависимости
COPY package*.json ./
RUN npm ci

# Prisma генерация клиента
COPY prisma ./prisma/
RUN npx prisma generate

# Сборка TypeScript
COPY . .
RUN npm run build

# ─── Stage 2: Runner ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Системный пользователь (не root)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 brainos

# Только prod-зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# Артефакты из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Статика для HTTP-сервера
COPY public ./public

# Папка для логов
RUN mkdir -p logs && chown -R brainos:nodejs /app

USER brainos

EXPOSE 3333

# Применяем миграции при старте, затем запускаем бот
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
