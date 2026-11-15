/**
 * lib/flowmerce-statut/core.ts
 * ----------------------------
 * Envoi des changements de statut de commande à Flowmerce (webhook signé).
 *
 * Ce fichier ne contient que la logique pure : configuration, construction du
 * corps, signature, envoi HTTP, interprétation des réponses, relances, et la
 * boucle d'envoi écrite contre une interface de stockage. Il n'importe ni
 * Prisma ni Next.js, pour être testable avec `node --test` (cf. tests/).
 * Le branchement sur la base et sur `after()` est dans ./index.ts.
 *
 * Fiabilité (file d'envoi « outbox ») :
 *   1. Le changement de statut et l'événement à envoyer sont écrits dans la
 *      même transaction (enregistrerChangementsStatut).
 *   2. L'envoi a lieu hors de la requête de l'utilisateur, puis par le cron.
 *   3. Chaque événement a un identifiant fixe, réutilisé à chaque essai ;
 *      seuls l'horodatage et la signature sont recalculés.
 *
 * Ne jamais journaliser le secret, la clé API ni la signature.
 */

import { createHmac, randomUUID } from 'node:crypto'

// ── Configuration ───────────────────────────────────────────────────────────

export type FlowmerceStatutConfig = {
  url: string
  apiKey: string
  secret: string
}

/** Variables d'environnement lues (serveur uniquement, jamais NEXT_PUBLIC_). */
export const VARIABLES_ENV = {
  url:    'FLOWMERCE_WEBHOOK_URL',
  apiKey: 'FLOWMERCE_API_KEY',
  // Distincte de FLOWMERCE_WEBHOOK_SECRET, qui vérifie déjà le webhook
  // entrant des retours (app/api/retours/webhook) avec une autre valeur.
  secret: 'FLOWMERCE_STATUS_WEBHOOK_SECRET',
} as const

let avertissementEmis = false

/**
 * Lit la configuration. Retourne null (envoi désactivé) si une variable manque
 * ou si l'URL n'est pas http(s) ; un avertissement est journalisé une fois,
 * avec le nom des variables seulement, jamais leur valeur.
 */
export function lireConfig(
  env: Record<string, string | undefined> = process.env,
  log: Pick<Console, 'warn'> = console,
): FlowmerceStatutConfig | null {
  const url    = (env[VARIABLES_ENV.url] ?? '').trim()
  const apiKey = (env[VARIABLES_ENV.apiKey] ?? '').trim()
  const secret = (env[VARIABLES_ENV.secret] ?? '').trim()

  const manquantes = [
    !url && VARIABLES_ENV.url,
    !apiKey && VARIABLES_ENV.apiKey,
    !secret && VARIABLES_ENV.secret,
  ].filter(Boolean) as string[]

  let probleme = manquantes.length ? `variable(s) manquante(s) : ${manquantes.join(', ')}` : ''
  if (!probleme && !/^https?:\/\//i.test(url)) probleme = `${VARIABLES_ENV.url} n'est pas une URL http(s)`

  if (probleme) {
    if (!avertissementEmis) {
      avertissementEmis = true
      log.warn(`[flowmerce:statut] envoi des statuts désactivé — ${probleme}`)
    }
    return null
  }
  return { url, apiKey, secret }
}

/** Pour les tests : réarme l'avertissement unique. */
export function _reinitialiserAvertissement() { avertissementEmis = false }

// ── Libellés de statut ──────────────────────────────────────────────────────

/**
 * Libellés envoyés tels quels à Flowmerce (la correspondance avec ses propres
 * codes se configure chez Flowmerce). Ce sont les libellés français de la
 * boutique (lib/i18n/fr/orders.ts), indépendants de la langue de l'écran.
 * Ne pas les modifier sans mettre à jour la correspondance côté Flowmerce.
 */
export const LIBELLES_STATUT: Record<string, string> = {
  EN_ATTENTE:     'En attente',
  CONFIRMEE:      'Confirmée',
  EN_PREPARATION: 'En préparation',
  EXPEDIEE:       'Expédiée',
  LIVREE:         'Livrée',
  ANNULEE:        'Annulée',
}

// ── Construction du corps ───────────────────────────────────────────────────

/** Données de la commande nécessaires au corps (lues en base). */
export type CommandeSource = {
  id: string
  langue?: string | null
  user: {
    nom?: string | null
    prenom?: string | null
    email?: string | null
    telephone?: string | null
  }
  items: Array<{
    quantite: number
    variantNom?: string | null
    variantOptionValeur?: string | null
    product: { nom: string }
  }>
}

export type CorpsStatut = {
  order_id: string
  status: string
  updated_at: string
  customer?: { name?: string; email?: string; phone?: string; language?: 'fr' | 'ar' }
  items?: Array<{ name: string; qty: number }>
}

const MAX_ARTICLES = 200
const MAX_OCTETS = 256 * 1024

/** Numéro algérien local (05/06/07 + 8 chiffres) → +213… ; sinon tel quel. */
export function normaliserTelephone(tel: string | null | undefined): string | undefined {
  const brut = (tel ?? '').replace(/[\s.-]/g, '')
  if (!brut) return undefined
  if (/^0[567]\d{8}$/.test(brut)) return '+213' + brut.slice(1)
  return brut
}

function texte(v: string | null | undefined): string | undefined {
  const s = (v ?? '').trim()
  return s || undefined
}

/**
 * Construit le corps à partir de la commande. Les champs inconnus sont omis
 * (jamais de chaîne vide). `changeLe` est la date du changement de statut dans
 * la boutique, pas la date d'envoi.
 */
export function construireCorps(commande: CommandeSource, statut: string, changeLe: Date): CorpsStatut {
  const status = (LIBELLES_STATUT[statut] ?? statut).slice(0, 100)
  const corps: CorpsStatut = {
    order_id:   commande.id.slice(0, 200),
    status,
    updated_at: changeLe.toISOString(),
  }

  const name = texte([commande.user.prenom, commande.user.nom].map(texte).filter(Boolean).join(' '))
  const email = texte(commande.user.email)
  const phone = normaliserTelephone(commande.user.telephone)
  const language = commande.langue === 'fr' || commande.langue === 'ar' ? commande.langue : undefined
  const customer: NonNullable<CorpsStatut['customer']> = {}
  if (name) customer.name = name
  if (email) customer.email = email
  if (phone) customer.phone = phone
  if (language) customer.language = language
  if (Object.keys(customer).length) corps.customer = customer

  const items = commande.items.slice(0, MAX_ARTICLES).map(i => {
    const detail = [texte(i.variantNom), texte(i.variantOptionValeur)].filter(Boolean).join(', ')
    return { name: detail ? `${i.product.nom} (${detail})` : i.product.nom, qty: i.quantite }
  })
  if (items.length) corps.items = items

  // Corps limité à 256 Ko : on retire des articles plutôt que de se faire refuser.
  while (corps.items?.length && Buffer.byteLength(JSON.stringify(corps)) > MAX_OCTETS) {
    corps.items = corps.items.slice(0, Math.floor(corps.items.length / 2))
    if (!corps.items.length) delete corps.items
  }
  return corps
}

// ── Signature et envoi ──────────────────────────────────────────────────────

export function nouvelIdEvenement(): string {
  return `evt_${randomUUID()}`
}

/** HMAC-SHA256(secret, timestamp + "." + eventId + "." + corps), en hexadécimal. */
export function signer(secret: string, timestamp: string, eventId: string, corps: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${eventId}.${corps}`).digest('hex')
}

export const TIMEOUT_MS = 10_000

export type FetchLike = (url: string, init: {
  method: string
  headers: Record<string, string>
  body: string
  signal?: AbortSignal
  cache?: 'no-store'
}) => Promise<{ status: number; text(): Promise<string> }>

export type ResultatEnvoi =
  | { issue: 'livre'; code: number }
  | { issue: 'relance'; code?: number; erreur: string }
  | { issue: 'echec'; code: number; erreur: string; alerte: boolean }

/**
 * Envoie un événement une fois. `corps` est la chaîne exacte stockée : elle est
 * signée puis envoyée telle quelle, sans re-sérialisation.
 */
export async function envoyerUneFois(
  config: FlowmerceStatutConfig,
  eventId: string,
  corps: string,
  options: { fetch?: FetchLike; maintenant?: () => Date } = {},
): Promise<ResultatEnvoi> {
  const doFetch = options.fetch ?? (globalThis.fetch as unknown as FetchLike)
  const timestamp = String(Math.floor((options.maintenant?.() ?? new Date()).getTime() / 1000))

  let res: { status: number; text(): Promise<string> }
  try {
    res = await doFetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type':          'application/json',
        'User-Agent':            'CabaStore/1.0',
        'X-Flowmerce-Key':       config.apiKey,
        'X-Flowmerce-Event-Id':  eventId,
        'X-Flowmerce-Timestamp': timestamp,
        'X-Flowmerce-Signature': signer(config.secret, timestamp, eventId, corps),
      },
      body:   corps,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache:  'no-store',
    })
  } catch (err) {
    const nom = (err as Error)?.name
    return { issue: 'relance', erreur: nom === 'TimeoutError' || nom === 'AbortError' ? 'timeout' : `réseau : ${nom ?? 'erreur'}` }
  }

  return interpreterReponse(res.status, await lireExtrait(res))
}

async function lireExtrait(res: { text(): Promise<string> }): Promise<string> {
  try { return (await res.text()).slice(0, 500) } catch { return '' }
}

/** Traduit le code HTTP de Flowmerce en action (cf. contrat). */
export function interpreterReponse(code: number, extrait = ''): ResultatEnvoi {
  if ((code >= 200 && code < 300) || code === 409) return { issue: 'livre', code }
  const erreur = `HTTP ${code}${extrait ? ` — ${extrait}` : ''}`
  // Temporaire : erreur serveur, trop de requêtes, délai dépassé côté proxy.
  if (code >= 500 || code === 429 || code === 408) return { issue: 'relance', code, erreur }
  // 400, 401, 403 et autres 4xx : renvoyer le même événement ne changerait rien.
  return { issue: 'echec', code, erreur, alerte: code === 401 }
}

// ── Relances ────────────────────────────────────────────────────────────────

/** Délai avant l'essai n+1 après n échecs (le dernier essai est le 8e). */
const DELAIS_RELANCE_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 3600_000, 6 * 3600_000, 12 * 3600_000]
export const MAX_TENTATIVES = DELAIS_RELANCE_MS.length + 1

export function delaiRelance(tentatives: number): number | null {
  return tentatives >= MAX_TENTATIVES ? null : DELAIS_RELANCE_MS[Math.max(0, tentatives - 1)]
}

/** Durée pendant laquelle un worker garde un événement réservé (> timeout HTTP). */
export const DUREE_VERROU_MS = 60_000

// ── File d'envoi : écriture ─────────────────────────────────────────────────

export type ChangementStatut = { orderId: string; statut: string; changeLe: Date }

/** Sous-ensemble du client de transaction Prisma utilisé à l'écriture. */
export type TxEcriture = {
  order: { findMany(args: object): Promise<CommandeSource[]> }
  flowmerceStatusEvent: { createMany(args: { data: LigneEvenement[] }): Promise<unknown> }
}

export type LigneEvenement = { id: string; orderId: string; statut: string; corps: string }

export const SELECT_COMMANDE = {
  id: true,
  langue: true,
  user: { select: { nom: true, prenom: true, email: true, telephone: true } },
  items: { select: { quantite: true, variantNom: true, variantOptionValeur: true, product: { select: { nom: true } } } },
} as const

/**
 * Enregistre un événement par changement de statut, dans la transaction du
 * changement. Sans configuration Flowmerce, rien n'est écrit : on évite qu'une
 * activation tardive envoie aux clients des mois d'anciens statuts.
 */
export async function enregistrerChangementsStatut(
  tx: TxEcriture,
  changements: ChangementStatut[],
  config: FlowmerceStatutConfig | null = lireConfig(),
): Promise<string[]> {
  if (!config || changements.length === 0) return []

  const commandes = await tx.order.findMany({
    where:  { id: { in: [...new Set(changements.map(c => c.orderId))] } },
    select: SELECT_COMMANDE,
  })
  const parId = new Map(commandes.map(c => [c.id, c]))

  const lignes: LigneEvenement[] = []
  for (const c of changements) {
    const commande = parId.get(c.orderId)
    if (!commande) continue
    lignes.push({
      id:      nouvelIdEvenement(),
      orderId: c.orderId,
      statut:  c.statut,
      // Sérialisé une seule fois : c'est cette chaîne qui sera signée et envoyée à chaque essai.
      corps:   JSON.stringify(construireCorps(commande, c.statut, c.changeLe)),
    })
  }
  if (lignes.length) await tx.flowmerceStatusEvent.createMany({ data: lignes })
  return lignes.map(l => l.id)
}

// ── File d'envoi : traitement ───────────────────────────────────────────────

export type EvenementEnFile = {
  id: string
  orderId: string
  corps: string
  tentatives: number
  createdAt: Date
}

/** Accès à la table d'envoi (implémenté avec Prisma dans ./index.ts). */
export interface StockageFile {
  /** Événements EN_ATTENTE dont l'essai est dû et non réservés, du plus ancien au plus récent. */
  listerDus(maintenant: Date, limite: number): Promise<EvenementEnFile[]>
  /** Un événement plus ancien de la même commande attend encore d'être envoyé. */
  aUnPrecedentEnAttente(e: EvenementEnFile): Promise<boolean>
  /** Réserve l'événement de façon atomique ; false si un autre worker l'a pris. */
  reserver(id: string, maintenant: Date, jusqua: Date): Promise<boolean>
  marquerLivre(id: string, tentatives: number, code: number, maintenant: Date): Promise<void>
  programmerRelance(id: string, tentatives: number, prochainEssai: Date, code: number | undefined, erreur: string): Promise<void>
  marquerEchec(id: string, tentatives: number, code: number | undefined, erreur: string): Promise<void>
}

export type BilanEnvoi = { desactive: boolean; livres: number; relances: number; echecs: number; ignores: number }

/**
 * Envoie les événements dus. Ne lève jamais d'exception : un échec de
 * Flowmerce ou de la base est journalisé et l'événement reste en file.
 */
export async function traiterFile(
  stockage: StockageFile,
  options: {
    config?: FlowmerceStatutConfig | null
    fetch?: FetchLike
    maintenant?: () => Date
    limite?: number
    log?: Pick<Console, 'warn' | 'error' | 'info'>
  } = {},
): Promise<BilanEnvoi> {
  const log = options.log ?? console
  const horloge = options.maintenant ?? (() => new Date())
  const bilan: BilanEnvoi = { desactive: false, livres: 0, relances: 0, echecs: 0, ignores: 0 }

  const config = options.config === undefined ? lireConfig(process.env, log) : options.config
  if (!config) return { ...bilan, desactive: true }

  let dus: EvenementEnFile[]
  try {
    dus = await stockage.listerDus(horloge(), options.limite ?? 25)
  } catch (err) {
    log.error('[flowmerce:statut] lecture de la file impossible', (err as Error)?.message)
    return bilan
  }

  for (const e of dus) {
    try {
      // Ordre par commande : on attend que l'événement précédent soit livré ou en échec définitif.
      if (await stockage.aUnPrecedentEnAttente(e)) { bilan.ignores++; continue }
      const debut = horloge()
      if (!(await stockage.reserver(e.id, debut, new Date(debut.getTime() + DUREE_VERROU_MS)))) { bilan.ignores++; continue }

      const tentatives = e.tentatives + 1
      const r = await envoyerUneFois(config, e.id, e.corps, { fetch: options.fetch, maintenant: horloge })

      if (r.issue === 'livre') {
        await stockage.marquerLivre(e.id, tentatives, r.code, horloge())
        bilan.livres++
        continue
      }

      const delai = r.issue === 'relance' ? delaiRelance(tentatives) : null
      if (delai !== null) {
        await stockage.programmerRelance(e.id, tentatives, new Date(horloge().getTime() + delai), r.code, r.erreur)
        log.warn(`[flowmerce:statut] échec temporaire, nouvel essai prévu`, { eventId: e.id, orderId: e.orderId, tentatives, erreur: r.erreur })
        bilan.relances++
      } else {
        await stockage.marquerEchec(e.id, tentatives, r.code, r.erreur)
        const alerte = r.issue === 'echec' && r.alerte
        log.error(
          alerte
            ? '[flowmerce:statut] ALERTE — Flowmerce refuse la clé, la signature ou l\'horodatage (401). Vérifier FLOWMERCE_API_KEY, le secret de signature et l\'horloge du serveur.'
            : '[flowmerce:statut] événement abandonné',
          { eventId: e.id, orderId: e.orderId, tentatives, erreur: r.erreur },
        )
        bilan.echecs++
      }
    } catch (err) {
      log.error('[flowmerce:statut] erreur pendant l\'envoi', { eventId: e.id, message: (err as Error)?.message })
    }
  }
  return bilan
}

// ── Déclaration des statuts de la boutique ──────────────────────────────────
//
// PUT {origine de FLOWMERCE_WEBHOOK_URL}/api/v1/order-statuses
// Déclare à Flowmerce la liste complète des libellés de LIBELLES_STATUT, pour
// que son tableau de bord ne propose que ceux-là. La liste envoyée remplace la
// précédente : l'appel est idempotent (relancé chaque jour par le cron).
// Pas de signature HMAC sur cette route : la clé API suffit.

export const CHEMIN_DECLARATION_STATUTS = '/api/v1/order-statuses'
const MAX_LIBELLES = 50
const MAX_LONGUEUR_LIBELLE = 100

/** Même origine que le webhook, chemin /api/v1/order-statuses. */
export function urlDeclarationStatuts(webhookUrl: string): string {
  return new URL(CHEMIN_DECLARATION_STATUTS, new URL(webhookUrl).origin).toString()
}

/** Libellés déclarés : ceux de LIBELLES_STATUT, sans doublon, dans l'ordre. */
export function libellesADeclarer(): string[] {
  return [...new Set(Object.values(LIBELLES_STATUT))]
}

export type StatutDeclare = { label: string; status?: string; mapped: boolean }

export type ResultatDeclaration =
  | { issue: 'desactive' }
  | { issue: 'declare'; code: number; declaredAt?: string; statuts: StatutDeclare[]; nonReconnus: string[] }
  | { issue: 'echec'; code?: number; erreur: string }

/**
 * Déclare les statuts à Flowmerce. Ne lève jamais d'exception : un échec est
 * journalisé et retourné. Sans configuration, ne fait rien (comme l'envoi).
 */
export async function declarerStatuts(options: {
  config?: FlowmerceStatutConfig | null
  fetch?: FetchLike
  log?: Pick<Console, 'warn' | 'error' | 'info'>
} = {}): Promise<ResultatDeclaration> {
  const log = options.log ?? console
  try {
    const config = options.config === undefined ? lireConfig(process.env, log) : options.config
    if (!config) return { issue: 'desactive' }

    const statuses = libellesADeclarer()
    const trop = statuses.length > MAX_LIBELLES
    const tropLong = statuses.find(s => s.length > MAX_LONGUEUR_LIBELLE)
    if (trop || tropLong) {
      const erreur = trop ? `plus de ${MAX_LIBELLES} libellés` : `libellé de plus de ${MAX_LONGUEUR_LIBELLE} caractères : ${tropLong}`
      log.error('[flowmerce:statut] déclaration des statuts non envoyée —', erreur)
      return { issue: 'echec', erreur }
    }

    const doFetch = options.fetch ?? (globalThis.fetch as unknown as FetchLike)
    let res: { status: number; text(): Promise<string> }
    try {
      res = await doFetch(urlDeclarationStatuts(config.url), {
        method: 'PUT',
        headers: {
          'Content-Type':    'application/json',
          'User-Agent':      'CabaStore/1.0',
          'X-Flowmerce-Key': config.apiKey,
        },
        body:   JSON.stringify({ statuses }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache:  'no-store',
      })
    } catch (err) {
      const nom = (err as Error)?.name
      const erreur = nom === 'TimeoutError' || nom === 'AbortError' ? 'timeout' : `réseau : ${nom ?? 'erreur'}`
      log.warn('[flowmerce:statut] déclaration des statuts impossible, nouvel essai au prochain cron', { erreur })
      return { issue: 'echec', erreur }
    }

    let texteReponse = ''
    try { texteReponse = await res.text() } catch { /* corps illisible */ }
    if (res.status !== 200) {
      const erreur = `HTTP ${res.status}${texteReponse ? ` — ${texteReponse.slice(0, 500)}` : ''}`
      if (res.status === 401) {
        log.error('[flowmerce:statut] ALERTE — Flowmerce refuse la clé API (401) pour la déclaration des statuts. Vérifier FLOWMERCE_API_KEY.', { erreur })
      } else if (res.status === 403) {
        log.warn('[flowmerce:statut] déclaration des statuts refusée : suivi des commandes non activé côté Flowmerce (403)', { erreur })
      } else if (res.status === 400) {
        log.error('[flowmerce:statut] déclaration des statuts refusée : corps invalide (400)', { erreur })
      } else {
        log.warn('[flowmerce:statut] déclaration des statuts en échec, nouvel essai au prochain cron', { erreur })
      }
      return { issue: 'echec', code: res.status, erreur }
    }

    let data: { statuses?: unknown; declared_at?: unknown } | null = null
    try { data = JSON.parse(texteReponse) } catch { /* réponse non JSON : déclaration acceptée quand même */ }
    const statuts: StatutDeclare[] = Array.isArray(data?.statuses)
      ? (data.statuses as Array<Record<string, unknown>>)
          .filter(s => s && typeof s.label === 'string')
          .map(s => ({ label: s.label as string, status: typeof s.status === 'string' ? s.status : undefined, mapped: s.mapped !== false }))
      : []
    const nonReconnus = statuts.filter(s => !s.mapped).map(s => s.label)
    for (const label of nonReconnus) {
      log.warn(`[flowmerce:statut] libellé non reconnu par Flowmerce (mapped: false) : « ${label} » — à associer dans le tableau de bord Flowmerce`)
    }
    const declaredAt = typeof data?.declared_at === 'string' ? data.declared_at : undefined
    log.info(`[flowmerce:statut] ${statuses.length} statuts déclarés à Flowmerce${nonReconnus.length ? `, ${nonReconnus.length} non reconnu(s)` : ''}`)
    return { issue: 'declare', code: res.status, declaredAt, statuts, nonReconnus }
  } catch (err) {
    log.error('[flowmerce:statut] erreur pendant la déclaration des statuts', (err as Error)?.message)
    return { issue: 'echec', erreur: (err as Error)?.message ?? 'erreur' }
  }
}
