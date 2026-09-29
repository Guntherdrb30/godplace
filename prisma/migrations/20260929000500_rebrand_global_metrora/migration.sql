INSERT INTO "SystemSetting" ("id","key","value","updatedAt")
VALUES (
  'setting_metrora_branding',
  'site_branding',
  jsonb_build_object(
    'brandName','METRORA',
    'agentName','METRORA AI',
    'logoUrl','/metrora-mark.svg',
    'logoPathname',NULL,
    'colors',jsonb_build_object(
      'primaryHsl','221 83% 53%',
      'secondaryHsl','222 47% 16%'
    )
  ),
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE
SET
  "value" = EXCLUDED."value",
  "updatedAt" = CURRENT_TIMESTAMP;
