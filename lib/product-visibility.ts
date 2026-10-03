/**
 * lib/product-visibility.ts
 * -------------------------
 * Règle unique « ce produit est-il visible et achetable par un client ? ».
 * Utilisée par toutes les listes publiques, la fiche produit, le panier et la
 * création de commande — un produit masqué ne doit être ni affiché ni commandé.
 *
 * Visible = produit actif ET (catalogue admin OU vendeur approuvé dont
 * l'abonnement n'a pas expiré). Un vendeur suspendu ou à qui des pièces sont
 * demandées (statut ≠ APPROUVE) voit donc ses produits masqués.
 */

import type { Prisma } from '@/generated/prisma/client'
import { VENDEUR_SUSPENDU_PRIORITE } from '@/lib/constants'

/** Vendeur dont les produits sont publiés. */
export const VENDEUR_VISIBLE = {
  statut: 'APPROUVE' as const,
  prioriteAffichage: { lt: VENDEUR_SUSPENDU_PRIORITE },
} satisfies Prisma.VendeurProfileWhereInput

/** Filtre Prisma des produits visibles par les clients. */
export const PRODUIT_VISIBLE = {
  actif: true,
  OR: [{ vendeurId: null }, { vendeur: VENDEUR_VISIBLE }],
} satisfies Prisma.ProductWhereInput

/** Même règle, appliquée à un produit déjà chargé (avec son vendeur). */
export function isProduitVisible(p: {
  actif: boolean
  vendeur: { statut: string; prioriteAffichage: number } | null
}): boolean {
  if (!p.actif) return false
  if (!p.vendeur) return true
  return p.vendeur.statut === 'APPROUVE' && p.vendeur.prioriteAffichage < VENDEUR_SUSPENDU_PRIORITE
}
