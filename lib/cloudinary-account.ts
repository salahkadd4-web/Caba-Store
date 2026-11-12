/**
 * lib/cloudinary-account.ts
 * -------------------------
 * Compte Cloudinary de Caba Store : source unique pour next.config.ts (filtre de
 * /_next/image), le SDK d'upload, la validation des URL d'images reçues par les
 * API et les images Open Graph.
 *
 * Sans dépendance ni alias : importé tel quel par next.config.ts.
 */

/** Compte par défaut (celui de toutes les images en base). */
export const CLOUD_PAR_DEFAUT = 'duriovuxy'

// Nom de compte Cloudinary : lettres, chiffres, « - » et « _ ».
const NOM_VALIDE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/

let avertissementEmis = false

/**
 * CLOUDINARY_CLOUD_NAME nettoyé (espaces et retours à la ligne retirés).
 * Variable absente ou invalide → compte par défaut, avec un avertissement unique
 * dans les journaux : jamais de filtre ouvert à tous les comptes, jamais de
 * chemin cassé par un caractère parasite.
 */
export function lireCloudName(brut: string | undefined = process.env.CLOUDINARY_CLOUD_NAME): string {
  const nom = (brut ?? '').trim()
  if (NOM_VALIDE.test(nom)) return nom
  if (!avertissementEmis) {
    avertissementEmis = true
    console.warn(
      `[cloudinary] CLOUDINARY_CLOUD_NAME ${nom ? 'invalide' : 'absente'} — compte « ${CLOUD_PAR_DEFAUT} » utilisé.`,
    )
  }
  return CLOUD_PAR_DEFAUT
}

const EXTENSION_IMAGE = /\.(?:jpe?g|png|webp|gif|avif)$/i
// Après /image/upload/ : version, dossiers, identifiant (et transformations éventuelles).
const CHEMIN_SUR = /^[A-Za-z0-9/_.,-]+$/
const LONGUEUR_MAX = 1000

/**
 * Vrai seulement pour une image livrée par le compte Caba Store :
 * https://res.cloudinary.com/<compte>/image/upload/…/<id>.<jpg|png|webp|gif|avif>
 * Refuse les autres comptes, les autres domaines (y compris res.cloudinary.com.evil…,
 * user@host), http, les ports, identifiants, paramètres et fragments (même vides : « ? », « # »), segments
 * « .. », encodages et toute forme non canonique.
 */
export function estImageCabaStore(url: unknown, cloud: string = lireCloudName()): url is string {
  if (typeof url !== 'string' || url.length === 0 || url.length > LONGUEUR_MAX) return false
  // Aucun « ? » ni « # », même vides (« a.jpg? » garderait sinon la même ressource sous une forme non canonique)
  if (url.includes('?') || url.includes('#')) return false
  let u: URL
  try { u = new URL(url) } catch { return false }
  if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com') return false
  if (u.port || u.username || u.password || u.search || u.hash) return false
  // Forme canonique exigée : aucune réécriture par le parseur (« .. », %2e, majuscules, espaces…)
  if (u.href !== url) return false

  const prefixe = `/${cloud}/image/upload/`
  if (!u.pathname.startsWith(prefixe)) return false
  const reste = u.pathname.slice(prefixe.length)
  if (!CHEMIN_SUR.test(reste)) return false
  if (reste.split('/').some(s => s === '' || s === '.' || s === '..')) return false
  return EXTENSION_IMAGE.test(reste)
}

/** Format recommandé pour les aperçus de partage : 1200×630, JPEG, produit entier sur fond blanc. */
const TRANSFORMATION_OG = 'c_pad,w_1200,h_630,b_white,f_jpg,q_auto'

/**
 * Image Open Graph dérivée par Cloudinary (JPEG 1200×630) à partir d'une image
 * en base. L'URL d'origine n'est pas modifiée ; une URL qui n'est pas une image
 * versionnée du compte est renvoyée telle quelle.
 */
export function imageOpenGraph(url: string, alt: string, cloud: string = lireCloudName()) {
  const base = `https://res.cloudinary.com/${cloud}/image/upload/`
  if (!estImageCabaStore(url, cloud)) return { url, alt }
  const reste = url.slice(base.length)
  // Seulement « v123/…/id.ext » : une URL déjà transformée garderait un ordre de transformations ambigu.
  if (!/^v\d+\//.test(reste)) return { url, alt }
  return {
    url: `${base}${TRANSFORMATION_OG}/${reste.replace(EXTENSION_IMAGE, '.jpg')}`,
    alt,
    width: 1200,
    height: 630,
    type: 'image/jpeg',
  }
}

/**
 * Liste d'images reçue par une API : tableau de chaînes, chacune image du compte
 * Caba Store. `dejaEnBase` : URL déjà enregistrées sur l'objet modifié, acceptées
 * telles quelles pour qu'une modification ne casse jamais une image existante.
 */
export function imagesValides(liste: unknown, dejaEnBase: ReadonlySet<string> = new Set()): liste is string[] {
  return Array.isArray(liste) && liste.every(u => typeof u === 'string' && (dejaEnBase.has(u) || estImageCabaStore(u)))
}
