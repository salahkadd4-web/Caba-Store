-- Ajoute le suivi du signalement "refus à la livraison" sur Order.
-- refusLivraisonSignale évite le double-signalement côté UI (l'API Flowmerce
-- est déjà idempotente sur vendorId+orderId, mais l'UI doit refléter l'état
-- localement sans redemander à Flowmerce à chaque rendu).
ALTER TABLE "Order" ADD COLUMN "refusLivraisonSignale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "refusLivraisonRaison" TEXT;
