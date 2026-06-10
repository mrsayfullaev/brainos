-- CreateEnum
CREATE TYPE "NotionLinkedDbType" AS ENUM ('TASKS', 'NOTES');

-- CreateTable
CREATE TABLE "notion_linked_databases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotionLinkedDbType" NOT NULL,
    "databaseId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notion_linked_databases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notion_linked_databases_userId_type_idx" ON "notion_linked_databases"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "notion_linked_databases_userId_databaseId_key" ON "notion_linked_databases"("userId", "databaseId");

-- AddForeignKey
ALTER TABLE "notion_linked_databases" ADD CONSTRAINT "notion_linked_databases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
