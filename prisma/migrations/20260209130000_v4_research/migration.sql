-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "research_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "subQueries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "findings" JSONB,
    "report" TEXT,
    "sources" JSONB,
    "status" "ReportStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "research_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "research_reports_userId_status_idx" ON "research_reports"("userId", "status");

-- AddForeignKey
ALTER TABLE "research_reports" ADD CONSTRAINT "research_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
