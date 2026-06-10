-- Скрипт для очистки базы данных BrainOS
-- Удаляет все записи, но сохраняет структуру таблиц

-- Отключаем проверку foreign keys временно (для PostgreSQL)
SET session_replication_role = 'replica';

-- Очищаем таблицы (в правильном порядке)
TRUNCATE TABLE "ai_responses" CASCADE;
TRUNCATE TABLE "users" CASCADE;

-- Включаем проверку foreign keys обратно
SET session_replication_role = 'origin';

-- Сбрасываем sequences (автоинкременты)
-- (В нашем случае используется cuid, поэтому не требуется)

-- Выводим результат
SELECT 
    schemaname,
    tablename,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
