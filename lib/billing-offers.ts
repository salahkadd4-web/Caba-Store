/**
 * lib/billing-offers.ts
 * ---------------------
 * Offres vendeur : source de vérité unique (client et serveur).
 *
 * 4 niveaux = 4 priorités d'affichage, identiques quelle que soit la formule :
 *   - forfait, payé d'avance : 1 mois, 6 mois (−10 %) ou 12 mois (−20 %) ;
 *   - commission sur le prix des articles livrés, payée après chaque cycle.
 * Un nouveau vendeur démarre en commission Niveau 4 (2 %).
 * NIVEAU_0 est réservé à l'admin (priorité 0, jamais facturé).
 */

export const NIVEAUX_VENDEUR = ['NIVEAU_1', 'NIVEAU_2', 'NIVEAU_3', 'NIVEAU_4'] as const
export type NiveauVendeur = typeof NIVEAUX_VENDEUR[number]

export const MODES_FACTURATION = ['COMMISSION', 'FORFAIT'] as const
export type ModeFacturation = typeof MODES_FACTURATION[number]

export const FORFAIT_MENSUEL: Record<NiveauVendeur, number> = {
  NIVEAU_1: 5000,
  NIVEAU_2: 4000,
  NIVEAU_3: 3000,
  NIVEAU_4: 2000,
}

export const TAUX_COMMISSION: Record<NiveauVendeur, number> = {
  NIVEAU_1: 0.05,
  NIVEAU_2: 0.04,
  NIVEAU_3: 0.03,
  NIVEAU_4: 0.02,
}

export const DUREES_FORFAIT = {
  mensuel:    { mois: 1,  remise: 0 },
  semestriel: { mois: 6,  remise: 0.10 },
  annuel:     { mois: 12, remise: 0.20 },
} as const
export type DureeForfait = keyof typeof DUREES_FORFAIT
export const DUREES = Object.keys(DUREES_FORFAIT) as DureeForfait[]

export const OFFRE_INITIALE = { mode: 'COMMISSION', niveau: 'NIVEAU_4' } as const satisfies {
  mode: ModeFacturation; niveau: NiveauVendeur
}

/** Jours (depuis l'émission d'une facture) où le vendeur reçoit un rappel. */
export const RAPPELS_JOURS = [7, 15, 21, 25, 27, 29] as const

/** Priorité d'affichage d'un vendeur bloqué : produits masqués. */
export { VENDEUR_SUSPENDU_PRIORITE as PRIORITE_BLOQUE } from '@/lib/constants'

export const isNiveauVendeur = (v: unknown): v is NiveauVendeur =>
  typeof v === 'string' && (NIVEAUX_VENDEUR as readonly string[]).includes(v)
export const isModeFacturation = (v: unknown): v is ModeFacturation =>
  typeof v === 'string' && (MODES_FACTURATION as readonly string[]).includes(v)
export const isDureeForfait = (v: unknown): v is DureeForfait =>
  typeof v === 'string' && v in DUREES_FORFAIT

/** Priorité d'affichage : 0 = admin, puis 1 (la plus haute) à 4. */
export function prioriteDuNiveau(niveau: string): number {
  const n = Number(niveau.replace('NIVEAU_', ''))
  return Number.isInteger(n) && n >= 0 && n <= 4 ? n : 4
}

export function tauxCommission(niveau: string): number {
  return isNiveauVendeur(niveau) ? TAUX_COMMISSION[niveau] : 0
}

export function prixForfait(niveau: string, duree: string | null | undefined): number {
  if (!isNiveauVendeur(niveau)) return 0
  const d = DUREES_FORFAIT[isDureeForfait(duree) ? duree : 'mensuel']
  return Math.round(FORFAIT_MENSUEL[niveau] * d.mois * (1 - d.remise))
}

export const arrondi = (v: number) => Math.round(v * 100) / 100

/** Ajoute n mois en restant sur le dernier jour du mois si besoin (31 janv. + 1 → 28/29 févr.). */
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  const jour = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  const dernier = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(jour, dernier))
  return d
}

const JOUR = 86_400_000

/** Jours restants avant une date (arrondi au supérieur, jamais négatif). */
export function joursAvant(date: Date | string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(date).getTime() - now.getTime()) / JOUR))
}

/** Jours entiers écoulés depuis une date. */
export function joursDepuis(date: Date | string, now = new Date()): number {
  return Math.floor((now.getTime() - new Date(date).getTime()) / JOUR)
}

export function numeroFacture(id: string, date: Date | string): string {
  const stamp = new Date(date).toISOString().slice(0, 10).replace(/-/g, '')
  return `FAC-${stamp}-${id.slice(-6).toUpperCase()}`
}

export type OffreChoisie = { mode: ModeFacturation; niveau: NiveauVendeur; periodicite: DureeForfait | null }

/** Valide une offre reçue d'un formulaire (null si invalide). */
export function lireOffre(body: unknown): OffreChoisie | null {
  if (!body || typeof body !== 'object') return null
  const { mode, niveau, periodicite } = body as Record<string, unknown>
  if (!isModeFacturation(mode) || !isNiveauVendeur(niveau)) return null
  if (mode === 'COMMISSION') return { mode, niveau, periodicite: null }
  return isDureeForfait(periodicite) ? { mode, niveau, periodicite } : null
}

export const METHODES_PAIEMENT = ['virement', 'ccp', 'cash'] as const
