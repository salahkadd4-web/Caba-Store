/**
 * lib/algeria/server.ts
 * ---------------------
 * Validation serveur d'un couple wilaya / commune à partir des fichiers JSON.
 */

import 'server-only'
import communesFr from '@/public/Wilaya_Commune_FR.json'
import communesAr from '@/public/Wilaya_Commune_AR.json'
import { normalizeWilayaCode } from './index'

type RawWilaya = { code: string; name: string; communes: string[] }

const communesParWilaya = new Map<string, Set<string>>()
for (const list of [communesFr, communesAr] as RawWilaya[][]) {
  for (const w of list) {
    const set = communesParWilaya.get(w.code) ?? new Set<string>()
    for (const c of w.communes) set.add(c.trim())
    communesParWilaya.set(w.code, set)
  }
}

export type WilayaCommuneResult =
  | { ok: true; wilaya: string | null; commune: string | null }
  | { ok: false; field: 'wilaya' | 'commune' }

/**
 * Normalise et valide une saisie wilaya/commune.
 * - wilaya vide → null (autorisé ici, l'appelant décide si c'est obligatoire)
 * - wilaya inconnue → erreur
 * - commune absente des listes FR/AR de cette wilaya → erreur
 */
export function validateWilayaCommune(wilaya: unknown, commune: unknown): WilayaCommuneResult {
  const rawWilaya  = typeof wilaya  === 'string' ? wilaya.trim()  : ''
  const rawCommune = typeof commune === 'string' ? commune.trim() : ''

  if (!rawWilaya) {
    return rawCommune ? { ok: false, field: 'wilaya' } : { ok: true, wilaya: null, commune: null }
  }
  const code = normalizeWilayaCode(rawWilaya)
  if (!code) return { ok: false, field: 'wilaya' }
  if (!rawCommune) return { ok: true, wilaya: code, commune: null }
  if (!communesParWilaya.get(code)?.has(rawCommune)) return { ok: false, field: 'commune' }
  return { ok: true, wilaya: code, commune: rawCommune }
}
