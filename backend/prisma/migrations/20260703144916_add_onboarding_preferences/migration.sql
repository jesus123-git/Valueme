-- CreateEnum
CREATE TYPE "ModulePreference" AS ENUM ('PERSONAL', 'BUSINESS', 'BOTH');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "modulePreference" "ModulePreference" NOT NULL DEFAULT 'BOTH',
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "primaryCurrency" TEXT NOT NULL DEFAULT 'COP';

