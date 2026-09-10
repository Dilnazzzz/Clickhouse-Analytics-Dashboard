-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('ACCEPTED', 'DUPLICATE', 'REJECTED');

-- CreateTable
CREATE TABLE "EventDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestRequest" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "IngestStatus" NOT NULL,
    "reason" TEXT,
    "eventName" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stepsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventDefinition_name_key" ON "EventDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IngestRequest_idempotencyKey_key" ON "IngestRequest"("idempotencyKey");
