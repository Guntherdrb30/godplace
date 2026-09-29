-- METRORA real estate CRM domain.
-- Additive migration: existing Good Place records remain valid.

CREATE TYPE "PropertyType" AS ENUM (
  'HOUSE','APARTMENT','TOWNHOUSE','LAND','OFFICE','COMMERCIAL','WAREHOUSE','BUILDING','FARM','HOTEL','VACATION','OTHER'
);
CREATE TYPE "ListingOperationType" AS ENUM ('SALE','SHORT_RENT','LONG_RENT','COMMERCIAL_RENT');
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT','PENDING_REVIEW','PUBLISHED','PAUSED','RESERVED','CLOSED','ARCHIVED');
CREATE TYPE "LeadStage" AS ENUM ('NEW','CONTACTED','QUALIFIED','VISIT_SCHEDULED','VISIT_COMPLETED','OFFER','NEGOTIATION','WON','LOST');
CREATE TYPE "LeadPriority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW');
CREATE TYPE "DealStage" AS ENUM ('OPEN','OFFER','NEGOTIATION','WON','LOST');
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT','SENT','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED');

CREATE TABLE "Branch" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "city" TEXT,
  "region" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Branch_tenantId_slug_key" ON "Branch"("tenantId","slug");
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");
CREATE INDEX "Branch_tenantId_isActive_idx" ON "Branch"("tenantId","isActive");

CREATE TABLE "AgentProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "branchId" TEXT,
  "displayName" TEXT,
  "phone" TEXT,
  "licenseNumber" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgentProfile_tenantId_userId_key" ON "AgentProfile"("tenantId","userId");
CREATE INDEX "AgentProfile_tenantId_idx" ON "AgentProfile"("tenantId");
CREATE INDEX "AgentProfile_tenantId_isActive_idx" ON "AgentProfile"("tenantId","isActive");
CREATE INDEX "AgentProfile_branchId_idx" ON "AgentProfile"("branchId");

CREATE TABLE "OwnerProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "displayName" TEXT NOT NULL,
  "companyName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "idNumber" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OwnerProfile_tenantId_userId_key" ON "OwnerProfile"("tenantId","userId");
CREATE INDEX "OwnerProfile_tenantId_idx" ON "OwnerProfile"("tenantId");
CREATE INDEX "OwnerProfile_tenantId_isActive_idx" ON "OwnerProfile"("tenantId","isActive");
CREATE INDEX "OwnerProfile_email_idx" ON "OwnerProfile"("email");
CREATE INDEX "OwnerProfile_phone_idx" ON "OwnerProfile"("phone");

ALTER TABLE "Property"
  ADD COLUMN "propertyType" "PropertyType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "ownerProfileId" TEXT,
  ADD COLUMN "assignedAgentProfileId" TEXT;

CREATE INDEX "Property_ownerProfileId_idx" ON "Property"("ownerProfileId");
CREATE INDEX "Property_assignedAgentProfileId_idx" ON "Property"("assignedAgentProfileId");
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

CREATE TABLE "Listing" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "assignedAgentProfileId" TEXT,
  "operationType" "ListingOperationType" NOT NULL,
  "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Listing_propertyId_operationType_key" ON "Listing"("propertyId","operationType");
CREATE INDEX "Listing_tenantId_idx" ON "Listing"("tenantId");
CREATE INDEX "Listing_tenantId_status_idx" ON "Listing"("tenantId","status");
CREATE INDEX "Listing_propertyId_idx" ON "Listing"("propertyId");
CREATE INDEX "Listing_assignedAgentProfileId_idx" ON "Listing"("assignedAgentProfileId");
CREATE INDEX "Listing_operationType_idx" ON "Listing"("operationType");

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "listingId" TEXT,
  "propertyId" TEXT,
  "assignedAgentProfileId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "source" TEXT,
  "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
  "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
  "budgetCents" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "notes" TEXT,
  "lastContactAt" TIMESTAMP(3),
  "nextActionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");
CREATE INDEX "Lead_tenantId_stage_idx" ON "Lead"("tenantId","stage");
CREATE INDEX "Lead_listingId_idx" ON "Lead"("listingId");
CREATE INDEX "Lead_propertyId_idx" ON "Lead"("propertyId");
CREATE INDEX "Lead_assignedAgentProfileId_idx" ON "Lead"("assignedAgentProfileId");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

CREATE TABLE "Visit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "agentProfileId" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Visit_tenantId_idx" ON "Visit"("tenantId");
CREATE INDEX "Visit_tenantId_scheduledAt_idx" ON "Visit"("tenantId","scheduledAt");
CREATE INDEX "Visit_leadId_idx" ON "Visit"("leadId");
CREATE INDEX "Visit_propertyId_idx" ON "Visit"("propertyId");
CREATE INDEX "Visit_agentProfileId_idx" ON "Visit"("agentProfileId");

CREATE TABLE "Deal" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT,
  "propertyId" TEXT NOT NULL,
  "listingId" TEXT,
  "agentProfileId" TEXT,
  "ownerProfileId" TEXT,
  "stage" "DealStage" NOT NULL DEFAULT 'OPEN',
  "expectedAmountCents" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "closedAt" TIMESTAMP(3),
  "lostReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Deal_tenantId_idx" ON "Deal"("tenantId");
CREATE INDEX "Deal_tenantId_stage_idx" ON "Deal"("tenantId","stage");
CREATE INDEX "Deal_leadId_idx" ON "Deal"("leadId");
CREATE INDEX "Deal_propertyId_idx" ON "Deal"("propertyId");
CREATE INDEX "Deal_listingId_idx" ON "Deal"("listingId");
CREATE INDEX "Deal_agentProfileId_idx" ON "Deal"("agentProfileId");
CREATE INDEX "Deal_ownerProfileId_idx" ON "Deal"("ownerProfileId");

CREATE TABLE "Offer" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
  "terms" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Offer_tenantId_idx" ON "Offer"("tenantId");
CREATE INDEX "Offer_tenantId_status_idx" ON "Offer"("tenantId","status");
CREATE INDEX "Offer_dealId_idx" ON "Offer"("dealId");

ALTER TABLE "Branch"
  ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentProfile"
  ADD CONSTRAINT "AgentProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentProfile"
  ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentProfile"
  ADD CONSTRAINT "AgentProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerProfile"
  ADD CONSTRAINT "OwnerProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerProfile"
  ADD CONSTRAINT "OwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property"
  ADD CONSTRAINT "Property_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property"
  ADD CONSTRAINT "Property_assignedAgentProfileId_fkey" FOREIGN KEY ("assignedAgentProfileId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_assignedAgentProfileId_fkey" FOREIGN KEY ("assignedAgentProfileId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_assignedAgentProfileId_fkey" FOREIGN KEY ("assignedAgentProfileId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal"
  ADD CONSTRAINT "Deal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal"
  ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal"
  ADD CONSTRAINT "Deal_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal"
  ADD CONSTRAINT "Deal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal"
  ADD CONSTRAINT "Deal_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal"
  ADD CONSTRAINT "Deal_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
