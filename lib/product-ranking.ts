/**
 * lib/product-ranking.ts
 * ----------------------
 * Ordre d'affichage des produits, partagé par toutes les listes (sauf
 * « Meilleures ventes », classée par nombre de ventes) :
 *   1. priorité d'affichage du vendeur = son niveau d'abonnement, identique en
 *      forfait (1, 6 ou 12 mois) et en commission : 1 (la plus haute) … 4
 *   2. vendeurs situés dans la même wilaya que le visiteur (si elle est connue)
 *   3. date de mise en ligne, du plus récent au plus ancien
 *
 * Les produits sans vendeur (catalogue Caba Store, admin) ont la priorité 0 :
 * toujours en tête.
 *
 * Une liste limitée (« take ») ne doit pas trier en base par date puis classer
 * les N plus récents : un produit Niveau 1 plus ancien en serait exclu. Utiliser
 * idsClasses(), qui classe tous les candidats avant de couper.
 */

import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { normalizeWilayaCode, WILAYAS } from '@/lib/algeria'

/** À ajouter au `select` Prisma d'un produit pour pouvoir le classer. */
export const VENDEUR_RANK_SELECT = {
  select: {
    prioriteAffichage: true,
    user: { select: { wilaya: true } },
  },
} as const

export type Rankable = {
  createdAt: Date | string
  vendeur?: { prioriteAffichage: number; user?: { wilaya: string | null } | null } | null
}

export function rankProducts<T extends Rankable>(products: T[], viewerWilaya?: string | null): T[] {
  const wilaya = normalizeWilayaCode(viewerWilaya)
  const proximite = (p: T) =>
    wilaya && normalizeWilayaCode(p.vendeur?.user?.wilaya) === wilaya ? 0 : 1

  return [...products].sort((a, b) =>
    (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0) ||
    proximite(a) - proximite(b) ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

/**
 * Valeurs possibles de User.wilaya pour une wilaya donnée : le code, et les noms
 * FR / AR (comptes antérieurs à la migration qui stockaient le nom).
 * Sert au filtre Prisma « wilaya du vendeur ».
 */
export function wilayaDbValues(code: string): string[] {
  const w = WILAYAS.find(x => x.code === code)
  return w ? [w.code, w.fr, w.ar] : [code]
}

/**
 * Identifiants des `take` produits les mieux classés parmi ceux qui satisfont `where`.
 * Requête légère (id, date, priorité, wilaya) sur tous les candidats, puis classement.
 */
export async function idsClasses(
  where: Prisma.ProductWhereInput,
  viewerWilaya: string | null | undefined,
  take: number,
): Promise<string[]> {
  const candidats = await prisma.product.findMany({
    where,
    select: { id: true, createdAt: true, vendeur: VENDEUR_RANK_SELECT },
  })
  return rankProducts(candidats, viewerWilaya).slice(0, take).map(p => p.id)
}

/** Remet des lignes chargées par `id: { in: ids }` dans l'ordre de `ids`. */
export function dansLOrdre<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const pos = new Map(ids.map((id, i) => [id, i]))
  return [...rows].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0))
}
