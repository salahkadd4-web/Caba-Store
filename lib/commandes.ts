/**
 * lib/commandes.ts
 * ----------------
 * Règles métier des commandes partagées par les routes admin et vendeur :
 * approbation par chaque acteur, annulation avec remise en stock.
 * Serveur uniquement.
 */

import 'server-only'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import { declencherEnvoi, enregistrerChangementsStatut } from '@/lib/flowmerce-statut'

/** Clé d'approbation de l'admin (produits sans vendeur) dans Order.approbationsVendeurs. */
export const APPROBATION_ADMIN = 'admin'

export type ResultatApprobation =
  | { ok: true; tousOk: boolean; commande: Prisma.OrderGetPayload<object> }
  | { ok: false; raison: 'introuvable' | 'dejaTraitee' }

/**
 * Enregistre l'approbation d'un acteur (id du vendeur, ou APPROBATION_ADMIN) et
 * confirme la commande quand tous les acteurs concernés ont approuvé.
 *
 * Concurrence : deux vendeurs qui approuvent en même temps ne doivent pas
 * s'écraser. L'écriture est conditionnée à `updatedAt` inchangé depuis la
 * lecture ; en cas de conflit on relit et on recommence.
 */
export async function enregistrerApprobation(orderId: string, acteur: string): Promise<ResultatApprobation> {
  for (let essai = 0; essai < 5; essai++) {
    const commande = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { product: { select: { vendeurId: true } } } } },
    })
    if (!commande) return { ok: false, raison: 'introuvable' }
    if (commande.statut !== 'EN_ATTENTE') return { ok: false, raison: 'dejaTraitee' }

    const vendeurIds = [
      ...new Set(commande.items.map(i => i.product.vendeurId).filter((v): v is string => v !== null)),
    ]
    const aDesProduitsAdmin = commande.items.some(i => i.product.vendeurId === null)

    const approbations = { ...((commande.approbationsVendeurs as Record<string, boolean> | null) ?? {}) }
    approbations[acteur] = true

    const tousOk =
      vendeurIds.every(vid => approbations[vid] === true) &&
      (!aDesProduitsAdmin || approbations[APPROBATION_ADMIN] === true)

    // Passage à CONFIRMEE : l'événement Flowmerce est écrit dans la même transaction.
    const maj = await prisma.$transaction(async tx => {
      const [ligne] = await tx.order.updateManyAndReturn({
        where: { id: orderId, statut: 'EN_ATTENTE', updatedAt: commande.updatedAt },
        data: {
          approbationsVendeurs: approbations,
          ...(tousOk ? { statut: 'CONFIRMEE' as const } : {}),
        },
      })
      if (ligne && tousOk) {
        await enregistrerChangementsStatut(tx, [{ orderId, statut: 'CONFIRMEE', changeLe: ligne.updatedAt }])
      }
      return ligne ?? null
    })
    if (maj) {
      if (tousOk) declencherEnvoi()
      return { ok: true, tousOk, commande: maj }
    }
    // Conflit : un autre acteur a écrit entre-temps → relire et recommencer
  }
  return { ok: false, raison: 'dejaTraitee' }
}

type LigneStock = { productId: string; variantId: string | null; variantOptionId: string | null; quantite: number }

/** Stock épuisé lors de la réactivation d'une commande annulée. */
export class StockInsuffisantError extends Error {
  constructor() { super('STOCK_INSUFFISANT') }
}

/** Reprend en stock les articles d'une commande ; lève StockInsuffisantError si une ligne manque. */
async function reprendreStock(tx: Prisma.TransactionClient, items: LigneStock[]) {
  for (const item of items) {
    const where = { stock: { gte: item.quantite } }
    const data  = { stock: { decrement: item.quantite } }
    const r = item.variantOptionId
      ? await tx.variantOption.updateMany({ where: { id: item.variantOptionId, ...where }, data })
      : item.variantId
        ? await tx.productVariant.updateMany({ where: { id: item.variantId, ...where }, data })
        : await tx.product.updateMany({ where: { id: item.productId, ...where }, data })
    if (r.count === 0) throw new StockInsuffisantError()
  }
}

/**
 * Sort une commande de l'état ANNULEE (vers EN_ATTENTE ou CONFIRMEE) en reprenant
 * son stock. Retourne false si la commande n'était pas annulée ; lève
 * StockInsuffisantError (rien n'est modifié) si le stock ne suffit plus.
 */
export async function reactiverCommande(orderId: string, statut: 'EN_ATTENTE' | 'CONFIRMEE'): Promise<boolean> {
  const ok = await prisma.$transaction(async tx => {
    const [ligne] = await tx.order.updateManyAndReturn({
      where:  { id: orderId, statut: 'ANNULEE' },
      data:   { statut },
      select: { updatedAt: true },
    })
    if (!ligne) return false
    const items = await tx.orderItem.findMany({
      where:  { orderId },
      select: { productId: true, variantId: true, variantOptionId: true, quantite: true },
    })
    await reprendreStock(tx, items)
    await enregistrerChangementsStatut(tx, [{ orderId, statut, changeLe: ligne.updatedAt }])
    return true
  })
  if (ok) declencherEnvoi()
  return ok
}

/**
 * Annule une commande et remet ses articles en stock, en une transaction.
 * Sans effet (retourne false) si la commande est déjà annulée ou livrée :
 * le stock n'est donc jamais restitué deux fois.
 */
export async function annulerCommande(orderId: string): Promise<boolean> {
  const ok = await prisma.$transaction(async tx => {
    const [ligne] = await tx.order.updateManyAndReturn({
      where:  { id: orderId, statut: { notIn: ['ANNULEE', 'LIVREE'] } },
      data:   { statut: 'ANNULEE' },
      select: { updatedAt: true },
    })
    if (!ligne) return false
    await enregistrerChangementsStatut(tx, [{ orderId, statut: 'ANNULEE', changeLe: ligne.updatedAt }])

    const items = await tx.orderItem.findMany({
      where:  { orderId },
      select: { productId: true, variantId: true, variantOptionId: true, quantite: true },
    })
    // Même niveau de stock que celui décrémenté à la commande (option > variante > produit)
    for (const item of items) {
      if (item.variantOptionId) {
        await tx.variantOption.updateMany({ where: { id: item.variantOptionId }, data: { stock: { increment: item.quantite } } })
      } else if (item.variantId) {
        await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { increment: item.quantite } } })
      } else {
        await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantite } } })
      }
    }
    return true
  })
  if (ok) declencherEnvoi()
  return ok
}
