/**
 * lib/product-ranking.ts
 * ----------------------
 * Ordre d'affichage des produits, partagé par toutes les listes :
 *   1. priorité d'affichage du vendeur (abonnement : 0 = la plus haute)
 *   2. vendeurs situés dans la même wilaya que le visiteur (si elle est connue)
 *   3. date de mise en ligne, du plus récent au plus ancien
 *
 * Les produits sans vendeur (catalogue Caba Store) ont la priorité 0.
 */

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
