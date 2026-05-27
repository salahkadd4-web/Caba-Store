/**
 * lib/prix.ts
 * -----------
 * Logique de prix dégressive centralisée.
 * Utilisé côté client ET serveur — ne pas importer de code Node-only ici.
 */

export type PrixTier = {
  minQte: number
  maxQte: number | null
  prix: number
}

/**
 * Caste un JSON arbitraire (Prisma JsonValue) en PrixTier[].
 * Retourne un tableau vide si la valeur n'est pas valide.
 */
export function parsePrixTiers(raw: unknown): PrixTier[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (t): t is PrixTier =>
      typeof t === 'object' &&
      t !== null &&
      typeof (t as PrixTier).minQte === 'number' &&
      typeof (t as PrixTier).prix === 'number',
  )
}

/**
 * Retourne le prix unitaire applicable pour une quantité donnée.
 * Si aucun palier ne correspond, retourne le prix de base.
 */
export function getPrixUnitaire(
  prixVariables: unknown,
  quantite: number,
  prixBase: number,
): number {
  const tiers = parsePrixTiers(prixVariables)
  if (tiers.length === 0) return prixBase

  const tier = tiers
    .filter((t) => quantite >= t.minQte && (t.maxQte === null || quantite <= t.maxQte))
    .sort((a, b) => b.minQte - a.minQte)[0]

  return tier?.prix ?? prixBase
}

/**
 * Retourne le prix minimal affiché sur les cartes produit.
 * Correspond au meilleur prix toutes palières confondues.
 */
export function getPrixMin(prixVariables: unknown, prixBase: number): number {
  const tiers = parsePrixTiers(prixVariables)
  if (tiers.length === 0) return prixBase
  return Math.min(...tiers.map((t) => t.prix), prixBase)
}

/**
 * Indique si le produit a des prix dégressifs actifs.
 */
export function hasPrixDegressif(prixVariables: unknown): boolean {
  return parsePrixTiers(prixVariables).length > 0
}

/**
 * Calcule le pourcentage de réduction entre le prix min et le prix de base.
 * Retourne null si pas de réduction.
 */
export function getPourcentageReduction(
  prixVariables: unknown,
  prixBase: number,
): number | null {
  const prixMin = getPrixMin(prixVariables, prixBase)
  if (prixMin >= prixBase) return null
  return Math.round((1 - prixMin / prixBase) * 100)
}
