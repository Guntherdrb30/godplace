-- METRORA multi-tenant foundation.
-- Non-destructive strategy:
-- 1) create tenant/membership structures;
-- 2) create one default tenant;
-- 3) backfill all existing operational data;
-- 4) enforce NOT NULL only after backfill.

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "TenantMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'AGENT', 'MEMBER');

CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");
CREATE INDEX "Tenant_isDefault_idx" ON "Tenant"("isDefault");

CREATE TABLE "TenantMembership" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "TenantMembershipRole" NOT NULL DEFAULT 'MEMBER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");
CREATE INDEX "TenantMembership_userId_idx" ON "TenantMembership"("userId");
CREATE INDEX "TenantMembership_role_idx" ON "TenantMembership"("role");
CREATE INDEX "TenantMembership_isActive_idx" ON "TenantMembership"("isActive");

ALTER TABLE "TenantMembership"
  ADD CONSTRAINT "TenantMembership_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantMembership"
  ADD CONSTRAINT "TenantMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Tenant" ("id", "slug", "name", "legalName", "status", "isDefault", "createdAt", "updatedAt")
VALUES (
  'tenant_metrora_default',
  'metrora-internal',
  'METRORA',
  'Trends172Tech',
  'ACTIVE',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "TenantMembership" ("id", "tenantId", "userId", "role", "isActive", "createdAt", "updatedAt")
SELECT
  'tm_' || u."id",
  t."id",
  u."id",
  CASE
    WHEN EXISTS (
      SELECT 1 FROM "UserRole" ur
      JOIN "Role" r ON r."id" = ur."roleId"
      WHERE ur."userId" = u."id" AND r."code" = 'ROOT'
    ) THEN 'OWNER'::"TenantMembershipRole"
    WHEN EXISTS (
      SELECT 1 FROM "UserRole" ur
      JOIN "Role" r ON r."id" = ur."roleId"
      WHERE ur."userId" = u."id" AND r."code" = 'ADMIN'
    ) THEN 'ADMIN'::"TenantMembershipRole"
    ELSE 'MEMBER'::"TenantMembershipRole"
  END,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN "Tenant" t
WHERE t."slug" = 'metrora-internal'
ON CONFLICT ("tenantId", "userId") DO NOTHING;

ALTER TABLE "AllyProfile" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Property" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "tenantId" TEXT;

UPDATE "AllyProfile"
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'metrora-internal' LIMIT 1)
WHERE "tenantId" IS NULL;

UPDATE "Property"
SET "tenantId" = COALESCE(
  (
    SELECT ap."tenantId"
    FROM "AllyProfile" ap
    WHERE ap."id" = "Property"."allyProfileId"
  ),
  (SELECT "id" FROM "Tenant" WHERE "slug" = 'metrora-internal' LIMIT 1)
)
WHERE "tenantId" IS NULL;

UPDATE "Booking"
SET "tenantId" = COALESCE(
  (
    SELECT p."tenantId"
    FROM "Property" p
    WHERE p."id" = "Booking"."propertyId"
  ),
  (SELECT "id" FROM "Tenant" WHERE "slug" = 'metrora-internal' LIMIT 1)
)
WHERE "tenantId" IS NULL;

UPDATE "AuditLog"
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'metrora-internal' LIMIT 1)
WHERE "tenantId" IS NULL;

ALTER TABLE "AllyProfile" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Property" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "AllyProfile_tenantId_idx" ON "AllyProfile"("tenantId");
CREATE INDEX "AllyProfile_tenantId_status_idx" ON "AllyProfile"("tenantId", "status");
CREATE INDEX "Property_tenantId_idx" ON "Property"("tenantId");
CREATE INDEX "Property_tenantId_status_idx" ON "Property"("tenantId", "status");
CREATE INDEX "Booking_tenantId_idx" ON "Booking"("tenantId");
CREATE INDEX "Booking_tenantId_status_idx" ON "Booking"("tenantId", "status");
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

ALTER TABLE "AllyProfile"
  ADD CONSTRAINT "AllyProfile_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Property"
  ADD CONSTRAINT "Property_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
