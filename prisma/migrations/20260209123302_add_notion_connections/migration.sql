-- CreateTable
CREATE TABLE "notion_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "workspaceId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notion_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notion_connections_userId_key" ON "notion_connections"("userId");

-- CreateIndex
CREATE INDEX "notion_connections_userId_idx" ON "notion_connections"("userId");

-- AddForeignKey
ALTER TABLE "notion_connections" ADD CONSTRAINT "notion_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
