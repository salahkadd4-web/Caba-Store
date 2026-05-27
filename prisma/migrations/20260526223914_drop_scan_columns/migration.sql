-- Drop ML scan columns (feature removed)
ALTER TABLE "Order"
  DROP COLUMN "scan1Done",
  DROP COLUMN "scan1Result",
  DROP COLUMN "scan1ShippingAllowed",
  DROP COLUMN "scan2Done",
  DROP COLUMN "scan2Result";
