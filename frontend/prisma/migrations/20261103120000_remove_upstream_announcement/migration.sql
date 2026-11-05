-- The first announcement was the upstream project's own launch notice for its
-- hosted creator program. Remove it unless an admin has since edited it.
DELETE FROM "announcements"
WHERE "id" = 'creator-program-2026-10'
  AND "title" = 'The creator program is open'
  AND "description" LIKE 'Make content about SupoClip %';
