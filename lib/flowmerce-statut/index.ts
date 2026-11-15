/**
 * lib/flowmerce-statut/index.ts — SERVEUR UNIQUEMENT.
 *
 * Branche la logique de ./core.ts sur Prisma et sur `after()` de Next.js.
 *
 * Utilisation à chaque changement de statut d'une commande :
 *
 *   await prisma.$transaction(async tx => {
 *     … changement de statut …
 *     await enregistrerChangementsStatut(tx, [{ orderId, statut, changeLe }])
 *   })
 *   declencherEnvoi()   // envoi après la réponse, jamais bloquant
 *
 * Les événements non livrés sont repris par le cron /api/cron/flowmerce et à
 * chaque nouveau déclenchement.
 */

import 'server-only'
import { after } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import {
  traiterFile,
  enregistrerChangementsStatut as enregistrer,
  type ChangementStatut,
  type StockageFile,
  type TxEcriture,
} from './core'

export { LIBELLES_STATUT, lireConfig, declarerStatuts } from './core'
export type { ChangementStatut } from './core'

/** Écrit les événements à envoyer, dans la transaction du changement de statut. */
export function enregistrerChangementsStatut(tx: Prisma.TransactionClient, changements: ChangementStatut[]) {
  return enregistrer(tx as unknown as TxEcriture, changements)
}

const stockagePrisma: StockageFile = {
  listerDus(maintenant, limite) {
    return prisma.flowmerceStatusEvent.findMany({
      where: {
        etat: 'EN_ATTENTE',
        prochainEssai: { lte: maintenant },
        OR: [{ verrouJusqua: null }, { verrouJusqua: { lt: maintenant } }],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limite,
      select: { id: true, orderId: true, corps: true, tentatives: true, createdAt: true },
    })
  },

  async aUnPrecedentEnAttente(e) {
    const n = await prisma.flowmerceStatusEvent.count({
      where: { orderId: e.orderId, etat: 'EN_ATTENTE', createdAt: { lt: e.createdAt } },
    })
    return n > 0
  },

  // Réservation atomique : un seul worker obtient count === 1.
  async reserver(id, maintenant, jusqua) {
    const { count } = await prisma.flowmerceStatusEvent.updateMany({
      where: {
        id,
        etat: 'EN_ATTENTE',
        prochainEssai: { lte: maintenant },
        OR: [{ verrouJusqua: null }, { verrouJusqua: { lt: maintenant } }],
      },
      data: { verrouJusqua: jusqua },
    })
    return count === 1
  },

  async marquerLivre(id, tentatives, code, maintenant) {
    await prisma.flowmerceStatusEvent.update({
      where: { id },
      data: { etat: 'LIVRE', tentatives, dernierCode: code, derniereErreur: null, livreLe: maintenant, verrouJusqua: null },
    })
  },

  async programmerRelance(id, tentatives, prochainEssai, code, erreur) {
    await prisma.flowmerceStatusEvent.update({
      where: { id },
      data: { tentatives, prochainEssai, dernierCode: code ?? null, derniereErreur: erreur, verrouJusqua: null },
    })
  },

  async marquerEchec(id, tentatives, code, erreur) {
    await prisma.flowmerceStatusEvent.update({
      where: { id },
      data: { etat: 'ECHEC', tentatives, dernierCode: code ?? null, derniereErreur: erreur, verrouJusqua: null },
    })
  },
}

/** Envoie les événements dus (cron, ou après une réponse). Ne lève jamais. */
export function envoyerEvenementsEnAttente(limite?: number) {
  return traiterFile(stockagePrisma, { limite })
}

/**
 * Lance l'envoi après la réponse HTTP (Next.js `after`, prolongé par Vercel).
 * Hors d'une requête (script), l'envoi part en tâche détachée.
 */
export function declencherEnvoi(): void {
  const tache = () => envoyerEvenementsEnAttente().then(() => undefined)
  try {
    after(tache)
  } catch {
    void tache().catch(() => undefined)
  }
}
