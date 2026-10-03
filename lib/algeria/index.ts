/**
 * lib/algeria/index.ts
 * --------------------
 * Wilayas et communes d'Algérie. Importable côté client ET serveur.
 *
 * Stockage en base :
 *   - User.wilaya / Order.wilaya : CODE de la wilaya ("16"), indépendant de la langue.
 *     Les anciennes valeurs (nom français, ex. "Alger") restent lisibles grâce à
 *     normalizeWilayaCode().
 *   - User.commune / Order.commune : nom de la commune tel que choisi dans la liste
 *     (FR ou AR ; l'anglais utilise la liste FR). Les listes FR et AR des fichiers JSON ne sont pas alignées
 *     commune par commune, une traduction automatique n'est donc pas possible.
 */

import type { Locale } from '@/lib/i18n/config'
import { WILAYAS, type Wilaya } from './wilayas'

export { WILAYAS, type Wilaya }

const byCode = new Map(WILAYAS.map(w => [w.code, w]))

/**
 * Graphie des noms de lieux pour une langue : l'anglais reprend la graphie
 * latine des noms français (Alger, Béjaïa…) et la liste de communes FR.
 */
function placeScript(locale: Locale): 'fr' | 'ar' {
  return locale === 'ar' ? 'ar' : 'fr'
}

/** Supprime accents, apostrophes, tirets et casse pour comparer des noms. */
function simplify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟ]/g, '') // diacritiques arabes
    .replace(/[أإآ]/g, 'ا')
    .replace(/[''`\-\s]+/g, '')
    .toLowerCase()
}

const byName = new Map<string, string>()
for (const w of WILAYAS) {
  byName.set(simplify(w.fr), w.code)
  byName.set(simplify(w.ar), w.code)
}

/**
 * Convertit une valeur de wilaya (code "16", "6", ou ancien nom "Alger" / "الجزائر")
 * en code à deux chiffres. Retourne null si la valeur est inconnue.
 */
export function normalizeWilayaCode(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  if (/^\d{1,2}$/.test(v)) {
    const code = v.padStart(2, '0')
    return byCode.has(code) ? code : null
  }
  // Format "16 - Alger"
  const prefixed = v.match(/^(\d{1,2})\s*[-–]\s*/)
  if (prefixed) return normalizeWilayaCode(prefixed[1])
  return byName.get(simplify(v)) ?? null
}

export function getWilaya(value: string | null | undefined): Wilaya | null {
  const code = normalizeWilayaCode(value)
  return code ? byCode.get(code) ?? null : null
}

/** Nom affichable dans la langue demandée ; valeur brute si inconnue. */
export function wilayaName(value: string | null | undefined, locale: Locale): string {
  if (!value) return ''
  const w = getWilaya(value)
  return w ? w[placeScript(locale)] : value
}

/** "16 - Alger" / "16 - الجزائر" pour les listes déroulantes. */
export function wilayaLabel(w: Wilaya, locale: Locale): string {
  return `${w.code} - ${w[placeScript(locale)]}`
}

/** Adresse complète lisible : "adresse, commune, wilaya". */
export function formatFullAddress(
  parts: { adresse?: string | null; commune?: string | null; wilaya?: string | null },
  locale: Locale,
): string {
  return [parts.adresse, parts.commune, wilayaName(parts.wilaya, locale)]
    .map(s => s?.trim())
    .filter(Boolean)
    .join(', ')
}

// ─── Communes (fichiers JSON du dossier public) ───────────────────────────────

type RawWilaya = { code: string; name: string; communes: string[] }
export type CommunesByWilaya = Record<string, string[]>

/** Déduplique et trie les communes d'une wilaya dans l'ordre alphabétique de la langue. */
export function buildCommunesIndex(raw: RawWilaya[], locale: Locale): CommunesByWilaya {
  const collator = new Intl.Collator(placeScript(locale))
  const index: CommunesByWilaya = {}
  for (const w of raw) {
    index[w.code] = [...new Set(w.communes.map(c => c.trim()).filter(Boolean))].sort(collator.compare)
  }
  return index
}

export function communesFileUrl(locale: Locale): string {
  return placeScript(locale) === 'ar' ? '/Wilaya_Commune_AR.json' : '/Wilaya_Commune_FR.json'
}

const cache: Partial<Record<'fr' | 'ar', Promise<CommunesByWilaya>>> = {}

/** Charge (une seule fois par graphie, FR/EN partagent la liste FR) les communes depuis /public. Côté client. */
export function loadCommunes(locale: Locale): Promise<CommunesByWilaya> {
  const key = placeScript(locale)
  if (!cache[key]) {
    cache[key] = fetch(communesFileUrl(locale))
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<RawWilaya[]>
      })
      .then(raw => buildCommunesIndex(raw, locale))
      .catch(err => {
        delete cache[key] // permettre une nouvelle tentative
        throw err
      })
  }
  return cache[key]!
}
