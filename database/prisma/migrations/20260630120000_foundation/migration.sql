-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Owner', 'Admin', 'Trainer', 'Manager', 'Learner');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'Learner',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_createdBy_idx" ON "Organization"("createdBy");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");
CREATE INDEX "Activity_organizationId_createdAt_idx" ON "Activity"("organizationId", "createdAt");
CREATE INDEX "Activity_actorId_idx" ON "Activity"("actorId");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
