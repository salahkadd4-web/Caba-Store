-- File d'envoi des changements de statut de commande vers Flowmerce (lib/flowmerce-statut)
-- et langue du client mémorisée à la commande (customer.language du webhook).

-- CreateEnum
CREATE TYPE "FlowmerceEnvoiEtat" AS ENUM ('EN_ATTENTE', 'LIVRE', 'ECHEC');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "langue" TEXT;

-- CreateTable
CREATE TABLE "FlowmerceStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "statut" "OrderStatus" NOT NULL,
    "corps" TEXT NOT NULL,
    "etat" "FlowmerceEnvoiEtat" NOT NULL DEFAULT 'EN_ATTENTE',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "prochainEssai" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verrouJusqua" TIMESTAMP(3),
    "dernierCode" INTEGER,
    "derniereErreur" TEXT,
    "livreLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowmerceStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlowmerceStatusEvent_etat_prochainEssai_idx" ON "FlowmerceStatusEvent"("etat", "prochainEssai");

-- CreateIndex
CREATE INDEX "FlowmerceStatusEvent_orderId_createdAt_idx" ON "FlowmerceStatusEvent"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "FlowmerceStatusEvent" ADD CONSTRAINT "FlowmerceStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

