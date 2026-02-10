-- AlterTable
ALTER TABLE "Property"
ADD COLUMN     "ownershipContractAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "ownershipContractTermsVersion" TEXT;

