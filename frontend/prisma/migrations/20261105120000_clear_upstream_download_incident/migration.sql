-- The seeded download incident was the upstream project's own hosted outage.
-- Mark it resolved unless an admin has since edited it.
UPDATE "service_statuses"
SET "status" = 'operational',
    "headline" = 'Operational',
    "description" = 'Video downloads are working normally.',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'video-downloads'
  AND "status" = 'degraded'
  AND "headline" = 'Investigating'
  AND "description" LIKE 'We are investigating slow video downloads.%';
