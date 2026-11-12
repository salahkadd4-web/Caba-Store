-- Nouveau modèle d'abonnement vendeur : forfait (1 / 6 / 12 mois) OU commission
-- par commande livrée, 4 niveaux = 4 priorités d'affichage. Fin du « 1 an gratuit ».
-- Spec : docs/superpowers/specs/2026-11-12-abonnements-commission-design.md

-- ── Enums ────────────────────────────────────────────────────────────────────
-- NiveauAbonnement est recréé (et non ALTER TYPE … ADD VALUE) : une valeur ajoutée
-- par ADD VALUE n'est pas utilisable dans la même transaction, or les UPDATE plus
-- bas posent NIVEAU_4.
ALTER TYPE "NiveauAbonnement" RENAME TO "NiveauAbonnement_old";
CREATE TYPE "NiveauAbonnement" AS ENUM ('NIVEAU_0', 'NIVEAU_1', 'NIVEAU_2', 'NIVEAU_3', 'NIVEAU_4');
ALTER TABLE "Abonnement" ALTER COLUMN "niveau" DROP DEFAULT;
ALTER TABLE "Abonnement" ALTER COLUMN "niveau" TYPE "NiveauAbonnement" USING ("niveau"::text::"NiveauAbonnement");
DROP TYPE "NiveauAbonnement_old";

CREATE TYPE "ModeFacturation" AS ENUM ('COMMISSION', 'FORFAIT');
CREATE TYPE "StatutFacture" AS ENUM ('A_VENIR', 'EN_ATTENTE', 'PAYEE', 'ANNULEE');

-- Statut : passage temporaire en texte pour convertir les données.
ALTER TABLE "Abonnement" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "Abonnement" ALTER COLUMN "statut" TYPE TEXT USING ("statut"::text);
DROP TYPE "StatutAbonnement";
CREATE TYPE "StatutAbonnement" AS ENUM ('ACTIF', 'BLOQUE');

-- ── Abonnement : nouvelles colonnes ──────────────────────────────────────────
ALTER TABLE "Abonnement" DROP COLUMN "notifsSent",
ADD COLUMN     "forfaitFin" TIMESTAMP(3),
ADD COLUMN     "mode" "ModeFacturation" NOT NULL DEFAULT 'COMMISSION',
ADD COLUMN     "prochainMode" "ModeFacturation",
ADD COLUMN     "prochainNiveau" "NiveauAbonnement",
ADD COLUMN     "prochainePeriodicite" TEXT,
ADD COLUMN     "avoir" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ── Facture ──────────────────────────────────────────────────────────────────
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "type" "ModeFacturation" NOT NULL,
    "niveau" "NiveauAbonnement" NOT NULL,
    "periodicite" TEXT,
    "taux" DOUBLE PRECISION,
    "ventesBrutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nbCommandes" INTEGER NOT NULL DEFAULT 0,
    "montant" DOUBLE PRECISION NOT NULL,
    "avoirDeduit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodeDebut" TIMESTAMP(3) NOT NULL,
    "periodeFin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutFacture" NOT NULL DEFAULT 'EN_ATTENTE',
    "emiseLe" TIMESTAMP(3),
    "echeance" TIMESTAMP(3),
    "rappelsEnvoyes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "paiementId" TEXT,
    "payeeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Facture_paiementId_key" ON "Facture"("paiementId");
CREATE INDEX "Facture_abonnementId_idx" ON "Facture"("abonnementId");
CREATE INDEX "Facture_statut_echeance_idx" ON "Facture"("statut", "echeance");

ALTER TABLE "Facture" ADD CONSTRAINT "Facture_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "Abonnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "Paiement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Paiements déjà encaissés → factures payées (historique), avant de changer les niveaux.
INSERT INTO "Facture" ("id", "abonnementId", "type", "niveau", "periodicite", "montant",
  "periodeDebut", "periodeFin", "statut", "emiseLe", "echeance", "paiementId", "payeeLe",
  "createdAt", "updatedAt")
SELECT 'leg_' || p."id", p."abonnementId", 'FORFAIT', a."niveau", a."periodicite", p."montant",
  p."dateReglement", p."dateReglement", 'PAYEE', p."dateReglement", p."dateReglement", p."id", p."dateReglement",
  p."createdAt", CURRENT_TIMESTAMP
FROM "Paiement" p
JOIN "Abonnement" a ON a."id" = p."abonnementId";

-- ── Conversion des abonnements existants ────────────────────────────────────
-- Admin (NIVEAU_0) : inchangé, toujours actif.
UPDATE "Abonnement" SET "statut" = 'ACTIF' WHERE "niveau" = 'NIVEAU_0';

-- Forfait payé encore en cours : conservé jusqu'à sa date de fin ; nouveau cycle mensuel dès aujourd'hui.
UPDATE "Abonnement"
SET "mode" = 'FORFAIT',
    "forfaitFin" = "dateFin",
    "periodicite" = COALESCE("periodicite", 'mensuel'),
    "statut" = 'ACTIF',
    "dateDebut" = CURRENT_TIMESTAMP,
    "dateFin" = CURRENT_TIMESTAMP + INTERVAL '1 month'
WHERE "niveau" <> 'NIVEAU_0' AND "statut" = 'ACTIF' AND "dateFin" > CURRENT_TIMESTAMP;

-- Tous les autres (période gratuite, expirés, suspendus) : commission Niveau 4 (2 %), cycle dès aujourd'hui.
UPDATE "Abonnement"
SET "mode" = 'COMMISSION',
    "niveau" = 'NIVEAU_4',
    "statut" = 'ACTIF',
    "periodicite" = NULL,
    "forfaitFin" = NULL,
    "dateDebut" = CURRENT_TIMESTAMP,
    "dateFin" = CURRENT_TIMESTAMP + INTERVAL '1 month'
WHERE "niveau" <> 'NIVEAU_0' AND "mode" = 'COMMISSION';

ALTER TABLE "Abonnement" ALTER COLUMN "statut" TYPE "StatutAbonnement" USING ("statut"::"StatutAbonnement");
ALTER TABLE "Abonnement" ALTER COLUMN "statut" SET DEFAULT 'ACTIF';
ALTER TABLE "Abonnement" ALTER COLUMN "niveau" SET DEFAULT 'NIVEAU_4';

-- Priorité d'affichage = numéro de niveau (0 admin, 1 la plus haute … 4).
ALTER TABLE "VendeurProfile" ALTER COLUMN "prioriteAffichage" SET DEFAULT 4;
UPDATE "VendeurProfile" v
SET "prioriteAffichage" = CASE a."niveau"
  WHEN 'NIVEAU_0' THEN 0
  WHEN 'NIVEAU_1' THEN 1
  WHEN 'NIVEAU_2' THEN 2
  WHEN 'NIVEAU_3' THEN 3
  ELSE 4
END
FROM "Abonnement" a
WHERE a."vendeurId" = v."id";

-- ── Order.livreeLe : date de livraison, base de la commission ────────────────
ALTER TABLE "Order" ADD COLUMN "livreeLe" TIMESTAMP(3);
UPDATE "Order" SET "livreeLe" = "updatedAt" WHERE "statut" = 'LIVREE';
CREATE INDEX "Order_livreeLe_idx" ON "Order"("livreeLe");

-- ── Retours : produit retourné, réponses, décision admin, correction de commission ──
ALTER TABLE "ReturnRequest" ADD COLUMN "productId" TEXT,
ADD COLUMN "reponses" JSONB,
ADD COLUMN "decideLe" TIMESTAMP(3),
ADD COLUMN "commissionAjustee" BOOLEAN NOT NULL DEFAULT false;
