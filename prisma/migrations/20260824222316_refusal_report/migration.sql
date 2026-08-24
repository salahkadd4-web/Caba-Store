-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refusLivraisonRaison" TEXT,
ADD COLUMN     "refusLivraisonSignale" BOOLEAN NOT NULL DEFAULT false;
