-- CreateEnum
CREATE TYPE "CharacterGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('NOT_STARTED', 'SEARCHING', 'SOLVING', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "LevelStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "enrollmentNumber" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "email" TEXT,
    "selectedCharacter" "CharacterGender" NOT NULL DEFAULT 'MALE',
    "status" "PlayerStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "score" INTEGER NOT NULL DEFAULT 0,
    "penaltySeconds" INTEGER NOT NULL DEFAULT 0,
    "gameTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelProgress" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "status" "LevelStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "penaltySeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_enrollmentNumber_key" ON "Player"("enrollmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE INDEX "Player_enrollmentNumber_idx" ON "Player"("enrollmentNumber");

-- CreateIndex
CREATE INDEX "GameSession_playerId_idx" ON "GameSession"("playerId");

-- CreateIndex
CREATE INDEX "LevelProgress_playerId_idx" ON "LevelProgress"("playerId");

-- CreateIndex
CREATE INDEX "LevelProgress_levelId_idx" ON "LevelProgress"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelProgress_playerId_levelId_key" ON "LevelProgress"("playerId", "levelId");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelProgress" ADD CONSTRAINT "LevelProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
