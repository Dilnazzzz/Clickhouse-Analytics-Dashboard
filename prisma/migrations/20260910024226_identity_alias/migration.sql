-- CreateTable
CREATE TABLE "IdentityAlias" (
    "anonymousId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityAlias_pkey" PRIMARY KEY ("anonymousId")
);

-- CreateIndex
CREATE INDEX "IdentityAlias_userId_idx" ON "IdentityAlias"("userId");
