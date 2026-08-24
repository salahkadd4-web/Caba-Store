// lib/flowmerce.ts — client serveur de l'API Flowmerce (SERVEUR UNIQUEMENT).
//
// Flowmerce est l'unique source de vérité pour les politiques de retour et
// les formulaires de retour. Caba Store n'est qu'un client :
//   - getReturnForm()  → récupère la définition du formulaire (JSON)
//   - submitReturn()   → envoie les réponses du client
// Aucune logique métier de retour n'est codée ici.
//
// Flowmerce est une boîte noire : aucune information de boutique (shopId,
// shopSlug, Vendor, ReturnPolicy) n'est transmise. La FLOWMERCE_API_KEY est
// l'unique mécanisme d'identification — Flowmerce retrouve automatiquement
// le Vendor et la ReturnPolicy associés à la clé.

import 'server-only'
import type {
  ReturnForm,
  ReturnSubmission,
  ReturnSubmissionResult,
  ReportRefusalPayload,
  ReportRefusalResult,
} from '@/lib/flowmerce-types'
import { RETURN_FORM_CACHE_TTL_MS } from '@/lib/flowmerce-types'

const FLOWMERCE_API_URL = (process.env.FLOWMERCE_API_URL || '').replace(/\/$/, '')
const FLOWMERCE_API_KEY = process.env.FLOWMERCE_API_KEY || ''

/** Erreur normalisée des appels Flowmerce (HTTP, timeout, réseau). */
export class FlowmerceError extends Error {
  readonly status: number
  readonly code?: string
  readonly retryable: boolean

  constructor(message: string, status: number, options?: { code?: string; retryable?: boolean }) {
    super(message)
    this.name     = 'FlowmerceError'
    this.status   = status
    this.code     = options?.code
    this.retryable = options?.retryable ?? status >= 500
  }
}

function requireConfig(): void {
  if (!FLOWMERCE_API_URL || !FLOWMERCE_API_KEY) {
    throw new FlowmerceError('Service retours non configuré', 503, { retryable: false })
  }
}

function baseHeaders(): Record<string, string> {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${FLOWMERCE_API_KEY}`,
    'User-Agent':    'CabaStore/1.0',
  }
}

/** Parse une réponse Flowmerce en JSON (résilient au body non-JSON). */
async function parseJson<T>(res: Response): Promise<T | null> {
  try { return (await res.json()) as T } catch { return null }
}

/** Transforme un échec HTTP Flowmerce en FlowmerceError avec message lisible. */
async function toError(res: Response, fallback: string): Promise<FlowmerceError> {
  const data = await parseJson<{ error?: string; message?: string; code?: string }>(res)
  // Priorité au message explicite renvoyé par Flowmerce en JSON (data.error /
  // data.message). Les textes ci-dessous ne sont que des replis génériques.
  const message = data?.error ?? data?.message ?? (res.status === 401
    ? 'Authentification Flowmerce invalide : clé API refusée'
    : res.status === 403
      ? 'Accès refusé : la clé API ne permet pas d\u2019accéder à ce service'
      : res.status === 404
        ? 'Service de retour indisponible (endpoint introuvable)'
        : res.status === 422
          ? 'Retour refusé : hors politique de retour Flowmerce'
          : res.status === 429
            ? 'Trop de demandes, réessayez plus tard'
            : fallback)
  return new FlowmerceError(message, res.status, { code: data?.code, retryable: res.status >= 500 })
}

// ═════════════════════════════════════════════════════════════════════════
//  1. CHARGER LE FORMULAIRE — GET /api/v1/return-form
//  La clé API identifie à elle seule la boutique chez Flowmerce (Vendor →
//  ReturnPolicy → Return Form). Aucun identifiant de boutique n'est envoyé.
//  Cache en mémoire (TTL 5 min) pour éviter un appel API à chaque ouverture.
// ═════════════════════════════════════════════════════════════════════════

const FORM_TIMEOUT_MS = 10_000

const formCache = new Map<string, { form: ReturnForm; expiresAt: number }>()

export async function getReturnForm(): Promise<ReturnForm> {
  requireConfig()

  const cacheKey = 'return-form'
  const cached   = formCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.form

  let res: Response
  try {
    res = await fetch(`${FLOWMERCE_API_URL}/api/v1/return-form`, {
      method:  'GET',
      headers: baseHeaders(),
      cache:   'no-store',
      signal:  AbortSignal.timeout(FORM_TIMEOUT_MS),
    })
  } catch (err) {
    throw new FlowmerceError(
      'Service Flowmerce indisponible',
      503,
      { code: (err as Error)?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK', retryable: true },
    )
  }

  if (!res.ok) throw await toError(res, 'Impossible de charger le formulaire de retour')

  const form = await parseJson<ReturnForm>(res)
  if (!form || !Array.isArray(form.sections)) {
    throw new FlowmerceError('Réponse Flowmerce invalide', 502, { retryable: false })
  }

  formCache.set(cacheKey, { form, expiresAt: Date.now() + RETURN_FORM_CACHE_TTL_MS })
  return form
}

// ═════════════════════════════════════════════════════════════════════════
//  2. ENVOYER LES RÉPONSES — POST /api/v1/returns
// ═════════════════════════════════════════════════════════════════════════

const SUBMIT_TIMEOUT_MS = 15_000

export async function submitReturn(payload: ReturnSubmission): Promise<ReturnSubmissionResult> {
  requireConfig()

  let res: Response
  try {
    res = await fetch(`${FLOWMERCE_API_URL}/api/v1/returns`, {
      method:  'POST',
      headers: baseHeaders(),
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
    })
  } catch (err) {
    throw new FlowmerceError(
      'Service Flowmerce indisponible',
      503,
      { code: (err as Error)?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK', retryable: true },
    )
  }

  if (!res.ok) throw await toError(res, 'Erreur lors de la création du retour')

  const data = await parseJson<{ claim_id?: string; claimId?: string; status?: string }>(res)
  const claimId = data?.claim_id ?? data?.claimId
  if (!claimId) {
    throw new FlowmerceError('Réponse Flowmerce invalide : identifiant de demande manquant', 502, { retryable: false })
  }

  return { claimId, status: data?.status }
}

// ═════════════════════════════════════════════════════════════════════════
//  3. SIGNALER UN REFUS À LA LIVRAISON — POST /api/fraud/report-refusal
//  Flowmerce vérifie côté serveur que ce vendeur (identifié par la clé API)
//  a bien une trace de cette commande (Claim ou ReturnSession) avant
//  d'accepter le signalement — impossible de signaler un client jamais vu.
//  Idempotent chez Flowmerce sur (vendorId, orderId) : un second appel pour
//  la même commande renvoie alreadyReported: true plutôt qu'une erreur.
// ═════════════════════════════════════════════════════════════════════════

const REFUSAL_TIMEOUT_MS = 10_000

export async function reportDeliveryRefusal(
  payload: ReportRefusalPayload,
): Promise<ReportRefusalResult> {
  requireConfig()

  if (!payload.customerEmail && !payload.customerPhone) {
    throw new FlowmerceError(
      'customer_email ou customer_phone requis pour signaler un refus',
      422,
      { retryable: false },
    )
  }

  let res: Response
  try {
    res = await fetch(`${FLOWMERCE_API_URL}/api/fraud/report-refusal`, {
      method:  'POST',
      headers: baseHeaders(),
      body:    JSON.stringify({
        order_id:       payload.orderId,
        customer_email: payload.customerEmail,
        customer_phone: payload.customerPhone,
        refusal_reason: payload.reason,
      }),
      signal: AbortSignal.timeout(REFUSAL_TIMEOUT_MS),
    })
  } catch (err) {
    throw new FlowmerceError(
      'Service Flowmerce indisponible',
      503,
      { code: (err as Error)?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK', retryable: true },
    )
  }

  if (!res.ok) throw await toError(res, 'Erreur lors du signalement du refus à la livraison')

  const data = await parseJson<{
    ok?: boolean
    alreadyReported?: boolean
    newFraudScore?: number
    distinctVendors?: number
    totalRefusals?: number
  }>(res)

  return {
    alreadyReported: data?.alreadyReported ?? false,
    newFraudScore:   data?.newFraudScore,
    distinctVendors: data?.distinctVendors,
    totalRefusals:   data?.totalRefusals,
  }
}
