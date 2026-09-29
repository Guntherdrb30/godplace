-- Backfill legacy Good Place inventory into METRORA Listing.
-- Additive and idempotent.

INSERT INTO "Listing" (
  "id","tenantId","propertyId","assignedAgentProfileId","operationType",
  "status","title","description","priceCents","currency","publishedAt","createdAt","updatedAt"
)
SELECT
  CONCAT('listing_legacy_', p."id"),
  p."tenantId",
  p."id",
  p."assignedAgentProfileId",
  CASE WHEN p."operationType" = 'SALE'
    THEN 'SALE'::"ListingOperationType"
    ELSE 'SHORT_RENT'::"ListingOperationType"
  END,
  CASE
    WHEN p."status" = 'PUBLISHED' THEN 'PUBLISHED'::"ListingStatus"
    WHEN p."status" = 'PENDING_APPROVAL' THEN 'PENDING_REVIEW'::"ListingStatus"
    WHEN p."status" = 'REJECTED' THEN 'ARCHIVED'::"ListingStatus"
    ELSE 'DRAFT'::"ListingStatus"
  END,
  p."titulo",
  p."descripcion",
  p."pricePerNightCents",
  p."currency",
  CASE WHEN p."status" = 'PUBLISHED' THEN p."updatedAt" ELSE NULL END,
  p."createdAt",
  p."updatedAt"
FROM "Property" p
ON CONFLICT ("propertyId","operationType") DO NOTHING;
