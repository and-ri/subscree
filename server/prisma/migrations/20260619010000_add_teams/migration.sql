-- Teams feature: shared workspaces (teams) with members and email invitations.
-- Ownership of Subscription/Category/PaymentMethod moves from a single user to a
-- team. Existing data is preserved by giving every current user a personal team.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamInvitation_tokenHash_key" ON "TeamInvitation"("tokenHash");
CREATE INDEX "TeamInvitation_email_idx" ON "TeamInvitation"("email");
CREATE INDEX "TeamInvitation_teamId_idx" ON "TeamInvitation"("teamId");

-- AlterTable: add active team to users, team ownership to entities (nullable for backfill)
ALTER TABLE "User" ADD COLUMN "activeTeamId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "teamId" TEXT;
ALTER TABLE "Category" ADD COLUMN "teamId" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN "teamId" TEXT;

-- Backfill: one personal team per existing user, that user as OWNER.
CREATE TEMP TABLE "_user_team" (user_id TEXT PRIMARY KEY, team_id TEXT NOT NULL);

INSERT INTO "_user_team" (user_id, team_id)
SELECT "id", gen_random_uuid()::text FROM "User";

INSERT INTO "Team" ("id", "name", "createdAt", "updatedAt")
SELECT ut.team_id, COALESCE(NULLIF(u."name", ''), 'My') || '''s Team', now(), now()
FROM "_user_team" ut
JOIN "User" u ON u."id" = ut.user_id;

INSERT INTO "TeamMember" ("id", "teamId", "userId", "role", "createdAt")
SELECT gen_random_uuid()::text, ut.team_id, ut.user_id, 'OWNER', now()
FROM "_user_team" ut;

UPDATE "User" u SET "activeTeamId" = ut.team_id
FROM "_user_team" ut WHERE u."id" = ut.user_id;

UPDATE "Subscription" s SET "teamId" = ut.team_id
FROM "_user_team" ut WHERE s."userId" = ut.user_id;

UPDATE "Category" c SET "teamId" = ut.team_id
FROM "_user_team" ut WHERE c."userId" = ut.user_id;

UPDATE "PaymentMethod" p SET "teamId" = ut.team_id
FROM "_user_team" ut WHERE p."userId" = ut.user_id;

DROP TABLE "_user_team";

-- Enforce NOT NULL now that ownership is backfilled
ALTER TABLE "Subscription" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "PaymentMethod" ALTER COLUMN "teamId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Subscription_teamId_idx" ON "Subscription"("teamId");
CREATE INDEX "Category_teamId_idx" ON "Category"("teamId");
CREATE INDEX "PaymentMethod_teamId_idx" ON "PaymentMethod"("teamId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeTeamId_fkey" FOREIGN KEY ("activeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
