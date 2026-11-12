/**
 * Libellés d'offre et de facture partagés (client et serveur).
 */

import type { Dictionary } from '@/lib/i18n'
import { tauxCommission } from '@/lib/billing-offers'

type Offre = { mode: string; niveau: string; periodicite: string | null }

/** « Niveau 2 · Commission 4 % » / « Niveau 2 · Forfait 6 mois ». */
export function libelleOffre(t: Dictionary, o: Offre): string {
  const b = t.billing
  const niveau = b.levels[o.niveau]?.label ?? o.niveau
  if (o.niveau === 'NIVEAU_0') return niveau
  const detail = o.mode === 'FORFAIT'
    ? b.forfaitLabel(b.durations[o.periodicite ?? 'mensuel'] ?? o.periodicite ?? '')
    : b.commissionLabel(Math.round(tauxCommission(o.niveau) * 100))
  return `${niveau} · ${detail}`
}

/** Couleur de pastille par statut de facture (palette par rôle). */
export const FACTURE_STATUT_CLS: Record<string, string> = {
  A_VENIR:    'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  EN_ATTENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  PAYEE:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  ANNULEE:    'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
}

export const ABO_STATUT_CLS: Record<string, string> = {
  ACTIF:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  BLOQUE: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}
