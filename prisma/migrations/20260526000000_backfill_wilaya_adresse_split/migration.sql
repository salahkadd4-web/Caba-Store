-- Backfill: scinder les valeurs encodees "wilaya|||adresse" stockees
-- historiquement dans User.wilaya. Migration idempotente : ne touche que
-- les lignes ou le separateur '|||' est present.

UPDATE "User"
SET
  "adresse" = SUBSTRING("wilaya" FROM POSITION('|||' IN "wilaya") + 3),
  "wilaya"  = SUBSTRING("wilaya" FROM 1 FOR POSITION('|||' IN "wilaya") - 1)
WHERE "wilaya" LIKE '%|||%';
