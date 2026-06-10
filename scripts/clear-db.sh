#!/bin/bash

# Скрипт для очистки базы данных BrainOS
# Удаляет все записи, но сохраняет структуру таблиц

echo "🗑️  BrainOS Database Clear Script"
echo "=================================="
echo ""

# Проверка наличия .env
if [ ! -f ".env" ]; then
    echo "❌ .env файл не найден!"
    exit 1
fi

# Получаем DATABASE_URL из .env
source .env

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL не найден в .env!"
    exit 1
fi

echo "📊 База данных: $DATABASE_URL"
echo ""

# Проверяем аргументы
FORCE=false
for arg in "$@"; do
    if [ "$arg" = "--force" ] || [ "$arg" = "-f" ]; then
        FORCE=true
    fi
done

if [ "$FORCE" = true ]; then
    echo "🚀 Запуск с флагом --force (без подтверждения)"
    npx tsx scripts/clear-database.ts --force
else
    echo "⚠️  ВНИМАНИЕ: Будут удалены ВСЕ записи из базы данных!"
    echo "📋 Таблицы останутся, структура сохранится."
    echo ""
    npx tsx scripts/clear-database.ts
fi
