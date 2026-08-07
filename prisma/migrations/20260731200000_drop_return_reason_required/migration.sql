-- AlterTable: le motif (reason) n'est plus stocké localement.
-- Flowmerce est l'unique source de vérité : le formulaire, les champs, les
-- validations et les réponses lui appartiennent. Caba Store ne conserve que
-- la trace d'existence du claim (orderId, flowmerceClaimId, status).
ALTER TABLE "ReturnRequest" ALTER COLUMN "reason" DROP NOT NULL;
