-- AlterTable
ALTER TABLE "users" ADD COLUMN     "consentGivenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "blocked_telegram_users" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_telegram_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocked_telegram_users_telegramId_key" ON "blocked_telegram_users"("telegramId");

-- CreateIndex
CREATE INDEX "blocked_telegram_users_telegramId_idx" ON "blocked_telegram_users"("telegramId");
