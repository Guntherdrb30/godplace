-- CreateEnum
CREATE TYPE "PropertyOperationType" AS ENUM ('RENT', 'SALE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "AllyProfile" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "isCompany" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "onboardingSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rifNumber" TEXT,
ADD COLUMN     "sex" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "avenida" TEXT,
ADD COLUMN     "calle" TEXT,
ADD COLUMN     "nivelPlanta" TEXT,
ADD COLUMN     "operationType" "PropertyOperationType" NOT NULL DEFAULT 'RENT',
ADD COLUMN     "ownershipContractPathname" TEXT,
ADD COLUMN     "ownershipContractUrl" TEXT,
ADD COLUMN     "urbanizacion" TEXT;

-- CreateTable
CREATE TABLE "AllyContract" (
    "id" TEXT NOT NULL,
    "allyProfileId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "notasAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllyContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllyContract_allyProfileId_key" ON "AllyContract"("allyProfileId");

-- CreateIndex
CREATE INDEX "AllyContract_status_idx" ON "AllyContract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "AllyContract" ADD CONSTRAINT "AllyContract_allyProfileId_fkey" FOREIGN KEY ("allyProfileId") REFERENCES "AllyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

