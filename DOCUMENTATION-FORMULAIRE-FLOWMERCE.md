# Récupération du formulaire de retour depuis Flowmerce — Caba Store

> Documentation complète de tout ce qui a été fait pour brancher le formulaire de retour
> sur **Flowmerce** (source de vérité unique), avec les modifications et les codes.

---

## 1. Contexte et architecture

Avant, Caba Store codait en dur son formulaire de retour (motifs, champs, validations).
Désormais **Flowmerce est l'unique source de vérité** : le formulaire est récupéré au format JSON
(`GET /api/v1/return-form`), rendu dynamiquement côté client, puis les réponses
sont envoyées à Flowmerce (`POST /api/v1/returns`).

**Nouvelle API (sans identifiant de boutique)** : la récupération du formulaire ne nécessite
plus de `shopSlug` ni de `shopId`. Chaque boutique possède une **API Key Flowmerce** liée à un
Vendor et à une ReturnPolicy — le Vendor est retrouvé automatiquement grâce à la clé.
Caba Store ne transmet **que** `Authorization: Bearer FLOWMERCE_API_KEY`.

### Flux de données

```
Client (FlowmerceReturnForm)
   │  1. GET  /api/retours/form
   ▼
API route form (Next.js) ──► lib/flowmerce.getReturnForm() ──► GET {FLOWMERCE_API_URL}/api/v1/return-form
   │                          (Authorization: Bearer FLOWMERCE_API_KEY — cache mémoire TTL 5 min)
   ▼
JSON de définition du formulaire { version, title, description, fields[] }
   │
   ▼
Rendu dynamique via DynamicField (17 types de champs, aucun champ codé en dur)
   │
   │  2. upload fichier → POST /api/retours/upload (→ future API Flowmerce ou Cloudinary)
   │  3. POST /api/retours/submit
   ▼
API route submit (Next.js) ──► lib/flowmerce.submitReturn() ──► POST {FLOWMERCE_API_URL}/api/v1/returns
   │                          (création locale ReturnRequest PENDING avant, rollback si échec)
   ▼
Retour { claimId, status } → persistance locale (flowmerceClaimId) + marquage commande (retourDemande)
   │
   ▼
Flowmerce notifie les changements de statut → POST /api/retours/webhook (HMAC SHA-256) → mise à jour locale
```

### Principe clé

- **Aucune politique de retour n'est stockée localement** : formulaire, champs, motifs,
  validations, éligibilité → 100 % côté Flowmerce.
- Caba Store ne conserve que la **trace d'existence du claim** : `orderId`, `flowmerceClaimId`, `status`.
- **Aucun identifiant de boutique n'est transmis** (`shopSlug`, `shopId`, Vendor, ReturnPolicy) :
  la clé API est l'unique mécanisme d'identification entre Caba Store et Flowmerce.
- La `FLOWMERCE_API_KEY` ne quitte jamais le serveur (tout passe par les API routes Next.js).

---

## 2. Variables d'environnement ajoutées (`.env`)

| Variable | Rôle |
|---|---|
| `FLOWMERCE_API_URL` | URL de base de l'API Flowmerce (ex. `https://flowmerce.example.com`) |
| `FLOWMERCE_API_KEY` | Clé Bearer de l'API Flowmerce (server-side uniquement) — identifie la boutique chez Flowmerce |
| `FLOWMERCE_WEBHOOK_SECRET` | Secret HMAC pour vérifier les webhooks entrants |
| `FLOWMERCE_UPLOAD_URL` | (Optionnel) API d'upload Flowmerce ; repli Cloudinary si absent |

> `FLOWMERCE_SHOP_ID` a été **supprimée** : la nouvelle API Flowmerce retrouve le Vendor
> automatiquement via la clé API, aucune information de boutique ne doit être envoyée.

---

## 3. Modifications de la base de données (Prisma)

### 3.1 Modèle `ReturnRequest` + enum (`prisma/schema.prisma`)

Ajout du modèle `ReturnRequest` et de l'enum `ReturnRequestStatus`, plus le champ
`retourDemande` sur `Order` et la relation `order.returnRequest`.

```prisma
model Order {
  // ... champs existants ...
  retourDemande        Boolean     @default(false)
  items                OrderItem[]
  returnRequest        ReturnRequest?
}

model ReturnRequest {
  id                String              @id @default(cuid())
  orderId           String              @unique
  flowmerceClaimId  String?
  status            ReturnRequestStatus @default(PENDING)
  reason            String?
  description       String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  order             Order               @relation(fields: [orderId], references: [id])
}

enum ReturnRequestStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### 3.2 Migration — le motif (`reason`) n'est plus obligatoire

`prisma/migrations/20260731200000_drop_return_reason_required/migration.sql` :

```sql
-- AlterTable: le motif (reason) n'est plus stocké localement.
-- Flowmerce est l'unique source de vérité : le formulaire, les champs, les
-- validations et les réponses lui appartiennent. Caba Store ne conserve que
-- la trace d'existence du claim (orderId, flowmerceClaimId, status).
ALTER TABLE "ReturnRequest" ALTER COLUMN "reason" DROP NOT NULL;
```

---

## 4. Types partagés — `lib/flowmerce-types.ts`

Types TypeScript utilisés côté client ET serveur. **La définition du formulaire
n'est jamais codée en dur** : tout vient du JSON Flowmerce.

```ts
// lib/flowmerce-types.ts — types partagés (client + serveur) pour Flowmerce.
//
// Flowmerce est l'unique source de vérité pour les formulaires de retour :
// la définition du formulaire (champs, options, validations) arrive du JSON
// renvoyé par Flowmerce et n'est jamais codée en dur dans Caba Store.

/** Types de champs supportés par le moteur de formulaire dynamique. */
export type ReturnFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'tel'
  | 'date'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'image'
  | 'video'
  | 'file'
  | 'signature'
  | 'barcode'
  | 'qr'
  | 'switch'
  | 'boolean'

/** Règles de validation provenant du JSON Flowmerce (ex. `field.validation`). */
export interface ReturnFieldValidation {
  /** Champ obligatoire. */
  required?: boolean
  /** Valeur numérique minimale (champs number). */
  min?: number
  /** Valeur numérique maximale (champs number). */
  max?: number
  /** Longueur minimale (text, textarea, select multiple). */
  minLength?: number
  /** Longueur maximale (text, textarea, select multiple). */
  maxLength?: number
  /** Expression régulière testée sur la valeur (text, textarea). */
  regex?: string
  /** Extensions acceptées pour les champs image/video/file (ex. ['.jpg', '.png']). */
  allowedExtensions?: string[]
  /** Taille de fichier maximale en octets (image/video/file). */
  maxFileSize?: number
  /** Nombre minimal de sélections (checkbox à options multiples). */
  minItems?: number
  /** Nombre maximal de sélections (checkbox à options multiples). */
  maxItems?: number
}

/** Option d'un champ select / radio / checkbox : string simple ou { value, label }. */
export type ReturnOption = string | { value: string; label: string }

/** Définition d'un champ du formulaire, tel que renvoyé par Flowmerce. */
export interface ReturnField {
  /** Identifiant unique du champ — utilisé comme clé dans `answers`. */
  id: string
  /** Type de rendu du champ (voir ReturnFieldType). */
  type: ReturnFieldType
  /** Libellé affiché au-dessus du champ. */
  label?: string
  /** Placeholder pour les champs texte. */
  placeholder?: string
  /** Texte d'aide affiché sous le champ. */
  helpText?: string
  /** Champ obligatoire (raccourci équivalent à validation.required). */
  required?: boolean
  /** Options pour select / radio / checkbox. */
  options?: ReturnOption[]
  /** Valeur par défaut. */
  defaultValue?: unknown
  /** Règles de validation pilotées par Flowmerce. */
  validation?: ReturnFieldValidation
  /** Autoriser plusieurs fichiers (image/video/file) → tableau d'URLs. */
  multiple?: boolean
  /** Extras libres du JSON Flowmerce, ignorés par le moteur. */
  [key: string]: unknown
}

/** Définition complète du formulaire de retour, renvoyée par Flowmerce. */
export interface ReturnForm {
  /** Version du formulaire — utilisée pour détecter les versions incompatibles. */
  version: number
  /** Titre affiché en haut du formulaire. */
  title: string
  /** Description / instructions affichées sous le titre. */
  description?: string
  /** Champs du formulaire, rendus dynamiquement via `fields.map(...)`. */
  fields: ReturnField[]
}

/** Réponses collectées : { [fieldId]: valeur } — envoyées telles quelles à Flowmerce. */
export type ReturnAnswer = Record<string, unknown>

/** Payload envoyé à Flowmerce lors de la soumission.
 *  Aucun identifiant de boutique : la clé API Bearer identifie le Vendor et
 *  sa ReturnPolicy chez Flowmerce. */
export interface ReturnSubmission {
  orderId: string
  productId: string
  answers: ReturnAnswer
}

/** Résultat de soumission renvoyé par Flowmerce. */
export interface ReturnSubmissionResult {
  claimId: string
  status?: string
}

/** Erreur normalisée renvoyée par Flowmerce (HTTP ou réseau). */
export interface FlowmerceApiError {
  status: number
  message: string
  code?: string
}

/** Versions de formulaire supportées par le moteur Caba Store. */
export const SUPPORTED_FORM_VERSIONS = [1] as const

/** Délai de cache (ms) de la définition du formulaire côté serveur. */
export const RETURN_FORM_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
```

---

## 5. Client serveur Flowmerce — `lib/flowmerce.ts`

Client de l'API Flowmerce (**serveur uniquement**, `import 'server-only'`). Deux fonctions :
`getReturnForm()` (avec cache mémoire TTL 5 min pour ne pas appeler Flowmerce à chaque ouverture)
et `submitReturn()`. Classe d'erreur `FlowmerceError` normalisée (HTTP, timeout, réseau).

```ts
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
  const message = data?.error ?? data?.message ?? (res.status === 401
    ? 'Authentification Flowmerce invalide : clé API refusée'
    : res.status === 403
      ? 'Accès refusé : la clé API ne permet pas d\u2019accéder à ce service'
      : res.status === 404
        ? 'Formulaire de retour introuvable : la clé API n\u2019est liée à aucune politique de retour'
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
  if (!form || !Array.isArray(form.fields)) {
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
```

---

## 6. Validation pilotée par le JSON — `lib/flowmerce-validation.ts`

Aucune règle n'est codée en dur : toutes les règles viennent de `field.validation`,
`field.required`, `field.options`. Compatible client (aucun import serveur).

```ts
// lib/flowmerce-validation.ts — validation des réponses du formulaire de retour.
//
// Aucune règle de validation n'est codée en dur ici : toutes les règles
// proviennent de la définition du formulaire renvoyée par Flowmerce
// (field.validation + field.required + field.options…).
// Ce module est compatible client (aucun import serveur).

import type { ReturnField, ReturnFieldValidation, ReturnOption, ReturnAnswer } from '@/lib/flowmerce-types'

/** Valeur d'une réponse. */
type AnswerValue = unknown

/** Normalise une option du JSON (string ou { value, label }) en { value, label }. */
export function normalizeOption(option: ReturnOption): { value: string; label: string } {
  if (typeof option === 'string') return { value: option, label: option }
  return { value: option.value, label: option.label }
}

/** Extrait l'extension (sans le point) d'une URL ou d'un nom de fichier. */
function extensionOf(value: string): string {
  try {
    const path = new URL(value).pathname
    const ext  = path.slice(path.lastIndexOf('.'))
    return ext.startsWith('.') ? ext.slice(1).toLowerCase() : ''
  } catch {
    const lastDot = value.lastIndexOf('.')
    return lastDot >= 0 ? value.slice(lastDot + 1).toLowerCase() : ''
  }
}

function isPresent(value: AnswerValue): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** Vérifie un fichier sélectionné (avant upload) contre les règles du champ. */
export function validateFileSelection(field: ReturnField, file: File): string | null {
  const rules = field.validation

  if (rules?.maxFileSize != null && file.size > rules.maxFileSize) {
    return `Fichier trop volumineux (max ${formatBytes(rules.maxFileSize)})`
  }

  if (rules?.allowedExtensions?.length) {
    const ext      = extensionOf(file.name)
    const allowed  = rules.allowedExtensions.map(e => e.toLowerCase().replace(/^\./, ''))
    if (ext && !allowed.includes(ext)) {
      return `Extension non autorisée (${allowed.map(a => `.${a}`).join(', ')})`
    }
  }

  return null
}

/** Applique les règles du JSON sur une valeur (post-upload : la valeur est une URL). */
export function validateField(field: ReturnField, value: AnswerValue): string | null {
  const rules: ReturnFieldValidation = field.validation ?? {}
  const required = rules.required ?? field.required ?? false

  if (!isPresent(value)) {
    return required ? 'Ce champ est requis' : null
  }

  const values: AnswerValue[] = Array.isArray(value) ? value : [value]

  if (Array.isArray(value)) {
    if (rules.minItems != null && value.length < rules.minItems) {
      return `Sélectionnez au moins ${rules.minItems} élément${rules.minItems > 1 ? 's' : ''}`
    }
    if (rules.maxItems != null && value.length > rules.maxItems) {
      return `Sélectionnez au plus ${rules.maxItems} éléments`
    }
  }

  for (const v of values) {
    if (typeof v === 'string') {
      const text = v.trim()

      if (rules.minLength != null && text.length < rules.minLength) {
        return `Minimum ${rules.minLength} caractères`
      }
      if (rules.maxLength != null && text.length > rules.maxLength) {
        return `Maximum ${rules.maxLength} caractères`
      }
      if (rules.regex) {
        try {
          if (!new RegExp(rules.regex).test(text)) {
            return 'Format invalide'
          }
        } catch {
          // Regex invalide dans le JSON Flowmerce — on laisse passer côté client,
          // Flowmerce reste la source de vérité.
        }
      }
    }

    if (typeof v === 'number') {
      if (rules.min != null && v < rules.min) return `Valeur minimale : ${rules.min}`
      if (rules.max != null && v > rules.max) return `Valeur maximale : ${rules.max}`
    }

    if (typeof v === 'string' && rules.allowedExtensions?.length && isFileUrl(v)) {
      const ext     = extensionOf(v)
      const allowed = rules.allowedExtensions.map(e => e.toLowerCase().replace(/^\./, ''))
      if (ext && !allowed.includes(ext)) {
        return `Extension non autorisée (${allowed.map(a => `.${a}`).join(', ')})`
      }
    }
  }

  return null
}

/** Vrai si la valeur ressemble à une URL (fichier déjà uploadé). */
function isFileUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:') || value.startsWith('data:')
}

/** Valide l'ensemble des réponses d'un formulaire. Retourne { fieldId: message }. */
export function validateForm(formFields: ReturnField[], answers: ReturnAnswer): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const field of formFields) {
    const error = validateField(field, answers[field.id])
    if (error) errors[field.id] = error
  }

  return errors
}

/** Formate un nombre d'octets en lisible. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} Mo`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${bytes} o`
}

/** Construit la chaîne `accept` d'un input file à partir des règles du champ. */
export function acceptFor(field: ReturnField): string | undefined {
  const exts = field.validation?.allowedExtensions
  if (exts?.length) return exts.join(',')

  switch (field.type) {
    case 'image':
    case 'barcode':
    case 'qr':
      return 'image/*'
    case 'video':
      return 'video/*'
    default:
      return undefined
  }
}
```

---

## 7. Route API — récupérer le formulaire (`app/api/retours/form/route.ts`)

Point d'entrée du client : GET authentifié, rate limit, délègue à `getReturnForm()`
puis renvoie le JSON **tel quel** à Caba Store.

```ts
// app/api/retours/form/route.ts — CabaStore
//
// GET — Récupère la définition du formulaire de retour auprès de Flowmerce.
// Flowmerce est l'unique source de vérité : Caba Store ne fait que renvoyer
// le JSON tel quel au client (le formulaire est ensuite construit dynamiquement).
//
// Aucun identifiant de boutique n'est transmis : la FLOWMERCE_API_KEY (Bearer)
// identifie la boutique chez Flowmerce.
//
// Le formulaire est mis en cache côté serveur (TTL 5 min, voir lib/flowmerce.ts)
// pour éviter un appel API Flowmerce à chaque ouverture.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/getAuthToken'
import { getReturnForm, FlowmerceError } from '@/lib/flowmerce'
import { rateLimit, rateLimits } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, rateLimits.api)
  if (limited) return limited

  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const form = await getReturnForm()
    return NextResponse.json({ form })
  } catch (err) {
    if (err instanceof FlowmerceError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[retours/form] erreur inattendue', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

---

## 8. Route API — soumettre les réponses (`app/api/retours/submit/route.ts`)

Proxy serveur vers `POST /api/v1/returns` (la clé API ne quitte jamais le serveur).

Étapes :
1. Auth NextAuth (refus si non connecté)
2. Charger la commande + vérifier ownership (404 plutôt que 403 pour ne pas leak les commandes d'autrui)
3. Persister `ReturnRequest` PENDING en local — la **contrainte unique sur `orderId` agit comme un lock** : une seule demande par commande
4. POST Flowmerce (Bearer)
5. En cas d'échec → **rollback** (suppression du ReturnRequest local) pour permettre un retry
6. Succès → UPDATE avec `flowmerceClaimId` + marquer la commande `retourDemande = true`

```ts
// app/api/retours/submit/route.ts — CabaStore
//
// Proxy serveur vers Flowmerce — POST /api/v1/returns.
// La FLOWMERCE_API_KEY ne quitte jamais le serveur.
//
// Flowmerce est l'unique source de vérité pour la politique de retour :
//   - les réponses du formulaire (answers) sont transmises telles quelles
//   - la validation métier (éligibilité, motifs, fichiers…) est 100 % Flowmerce
//   - aucun identifiant de boutique n'est envoyé : la clé API identifie le
//     Vendor et sa ReturnPolicy chez Flowmerce
//   - Caba Store ne stocke que la trace locale du claim (orderId, claimId, statut)
//
// Étapes :
//   1. Auth NextAuth (refus si non connecté)
//   2. Charger la commande + vérifier ownership (sinon 404)
//   3. Persister ReturnRequest PENDING en local (lock applicatif via unique orderId)
//   4. POST vers FLOWMERCE_API_URL/api/v1/returns (Bearer)
//   5. Update ReturnRequest avec flowmerceClaimId / rollback si échec
//   6. Retourner uniquement { success, status, claimId }

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { submitReturn, FlowmerceError } from '@/lib/flowmerce'
import { rateLimit, rateLimits } from '@/lib/security'

const PRISMA_UNIQUE_VIOLATION = 'P2002'

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, rateLimits.api)
  if (limited) return limited

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const token = await getAuthToken()
  if (!token?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }

  const orderId   = String(body.orderId ?? '').trim()
  const productId = String(body.productId ?? '').trim()
  const answers   = body.answers

  if (!orderId || !productId) {
    return NextResponse.json({ error: 'Champs obligatoires manquants : orderId, productId' }, { status: 400 })
  }
  if (answers === undefined || answers === null || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'Champ answers invalide' }, { status: 400 })
  }

  // ── 3. Charger la commande + vérifier ownership ────────────────────────────
  // (404 plutôt que 403 pour ne pas leak l'existence de commandes d'autres users.)
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: token.id },
    include: { items: { select: { id: true, productId: true } } },
  })

  if (!order) {
    return NextResponse.json(
      { error: 'Commande introuvable' },
      { status: 404 }
    )
  }

  const item = order.items.find(i => i.productId === productId)
  if (!item) {
    return NextResponse.json(
      { error: 'Article introuvable dans la commande' },
      { status: 400 }
    )
  }

  // ── 4. Persist AVANT fetch — la contrainte unique sur orderId agit
  //      comme un lock applicatif. Seule la première requête crée la ligne.
  let returnRequest
  try {
    returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        flowmerceClaimId: null,
        status:           'PENDING',
        reason:           null,
        description:      null,
      },
    })
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (code === PRISMA_UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: 'Une demande de retour existe déjà pour cette commande.' },
        { status: 409 }
      )
    }
    throw err
  }

  // ── 5. POST Flowmerce ──────────────────────────────────────────────────────
  let result
  try {
    result = await submitReturn({
      orderId,
      productId,
      answers:  answers as Record<string, unknown>,
    })
  } catch (err) {
    // Réseau / timeout / HTTP Flowmerce : rollback pour permettre un retry.
    await rollback(returnRequest.id)

    if (err instanceof FlowmerceError) {
      if (err.status === 409) {
        return NextResponse.json(
          { error: 'Une demande de retour existe déjà pour cette commande.' },
          { status: 409 }
        )
      }
      if (err.status === 422) {
        // Flowmerce a rejeté la demande (hors politique, validation, etc.).
        return NextResponse.json({ error: err.message }, { status: 422 })
      }
      if (err.status === 429) {
        return NextResponse.json({ error: err.message }, { status: 429 })
      }
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    console.error('[retours/submit] erreur inattendue', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  // ── 6. Succès — UPDATE avec flowmerceClaimId + marquer la commande ────────
  const claimId     = result.claimId
  const rawStatus   = String(result.status ?? '').toUpperCase()
  const localStatus =
    rawStatus === 'APPROVED' ? 'APPROVED' :
    rawStatus === 'REJECTED' ? 'REJECTED' : 'PENDING'

  try {
    await prisma.$transaction([
      prisma.returnRequest.update({
        where: { id: returnRequest.id },
        data:  { flowmerceClaimId: claimId, status: localStatus },
      }),
      prisma.order.update({
        where: { id: orderId },
        data:  { retourDemande: true },
      }),
    ])
  } catch (err) {
    // Le claim existe déjà chez Flowmerce. On ne ment pas au client : succès.
    // Le webhook /api/retours/webhook réconciliera l'état plus tard.
    console.error('[retours/submit] persist post-succès KO', { claimId, returnRequestId: returnRequest.id, err })
  }

  return NextResponse.json(
    { success: true, status: localStatus, claimId },
    { status: 201 }
  )
}

// ─────────────────────────────────────────────────────────────────────────────

async function rollback(returnRequestId: string): Promise<void> {
  try {
    await prisma.returnRequest.delete({ where: { id: returnRequestId } })
  } catch (err) {
    console.error('[retours/submit] rollback ReturnRequest KO', { returnRequestId, err })
  }
}
```

---

## 9. Route API — upload des fichiers (`app/api/retours/upload/route.ts`)

Prêt pour Flowmerce : si `FLOWMERCE_UPLOAD_URL` est défini, le fichier part vers
`POST {FLOWMERCE_UPLOAD_URL}/api/v1/uploads` (Bearer `FLOWMERCE_API_KEY`).
Sinon, repli sur Cloudinary (comportement actuel). Validations minimales côté
serveur (taille 10 Mo, MIME) — le contrôle métier appartient à Flowmerce.

```ts
// app/api/retours/upload/route.ts — CabaStore
//
// POST — Upload d'un fichier (image / video / autre) pour une demande de retour.
//
// Prêt pour Flowmerce : si FLOWMERCE_UPLOAD_URL est défini, le fichier est
// envoyé tel quel à l'API d'upload Flowmerce (Bearer FLOWMERCE_API_KEY) et
// l'URL retournée est placée dans les réponses du formulaire.
// Sinon, repli sur Cloudinary (comportement actuel).
//
// Validations minimales côté serveur (le contrôle métier appartient à Flowmerce).

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/getAuthToken'
import { rateLimit, rateLimits } from '@/lib/security'

const FLOWMERCE_UPLOAD_URL = (process.env.FLOWMERCE_UPLOAD_URL || '').replace(/\/$/, '')
const FLOWMERCE_API_KEY    = process.env.FLOWMERCE_API_KEY || ''

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4',  'video/webm', 'video/quicktime',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export async function POST(req: NextRequest) {
  // Rate limiting — 20 uploads/heure
  const limited = await rateLimit(req, rateLimits.upload)
  if (limited) return limited

  try {
    const token = await getAuthToken()
    if (!token?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // ── Validation taille ─────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10 MB)' },
        { status: 400 }
      )
    }

    // ── Validation type MIME ──────────────────────────────────
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
        { status: 400 }
      )
    }

    // ── Upload Flowmerce (si configuré) ou Cloudinary ─────────
    const url = FLOWMERCE_UPLOAD_URL
      ? await uploadToFlowmerce(file)
      : await uploadToCloudinary(file)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[retours/upload] erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── Upload vers la future API Flowmerce ─────────────────────────────────────
async function uploadToFlowmerce(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${FLOWMERCE_UPLOAD_URL}/api/v1/uploads`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${FLOWMERCE_API_KEY}` },
    body:    formData,
    signal:  AbortSignal.timeout(30_000),
  })

  if (!res.ok) throw new Error(`Flowmerce upload HTTP ${res.status}`)

  const data = await res.json().catch(() => ({})) as { url?: string }
  if (!data.url) throw new Error('Flowmerce upload : URL manquante')

  return data.url
}

// ── Repli : upload Cloudinary ────────────────────────────────────────────────
async function uploadToCloudinary(file: File): Promise<string> {
  const { default: cloudinary } = await import('@/lib/cloudinary')

  const buffer = await file.arrayBuffer()
  const bytes  = new Uint8Array(buffer)

  // Magic bytes — image : jpeg/png/webp/gif, vidéo : ftyp(mp4) / webm
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8
  const isPng  = bytes[0] === 0x89 && bytes[1] === 0x50
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45
  const isGif  = bytes[0] === 0x47 && bytes[1] === 0x49
  const isMp4  = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  const isWebm = bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3
  const isPdf  = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46

  if (!isJpeg && !isPng && !isWebp && !isGif && !isMp4 && !isWebm && !isPdf) {
    throw new Error('Le contenu du fichier ne correspond pas à un type autorisé')
  }

  const dataUri = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder:         'cabastore/retours',
    resource_type:  file.type.startsWith('video') ? 'video' : 'auto',
    transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
  })

  return result.secure_url
}
```

---

## 10. Route API — webhook de réconciliation (`app/api/retours/webhook/route.ts`)

Webhook entrant Flowmerce (server-to-server, pas d'auth utilisateur) :
reçoit les changements de statut des claims (`PENDING → APPROVED / REJECTED`)
et réconcilie le `ReturnRequest` local.

Sécurité : signature **HMAC SHA-256** vérifiée avec `FLOWMERCE_WEBHOOK_SECRET`,
comparaison en temps constant (`timingSafeEqual`).

```ts
// app/api/retours/webhook/route.ts — CabaStore
//
// Webhook entrant Flowmerce — recoit les changements de statut des claims
// (PENDING -> APPROVED / REJECTED) et reconcilie le ReturnRequest local.
//
// Securite :
//   - Signature HMAC SHA-256 verifiee avec FLOWMERCE_WEBHOOK_SECRET
//   - Comparaison en temps constant (timingSafeEqual)
//   - Pas d'auth utilisateur — c'est un endpoint server-to-server

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

const FLOWMERCE_WEBHOOK_SECRET = process.env.FLOWMERCE_WEBHOOK_SECRET || ''

type FlowmerceEvent = {
  type?:  string                       // ex: "claim.updated"
  claim?: {
    id?:     string
    status?: string                    // PENDING | APPROVED | REJECTED
  }
}

export async function POST(req: NextRequest) {
  if (!FLOWMERCE_WEBHOOK_SECRET) {
    console.error('[flowmerce:webhook] 503 — FLOWMERCE_WEBHOOK_SECRET manquant')
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 })
  }

  // ── 1. Lire le body brut (necessaire pour HMAC) ──────────────────────────
  const rawBody = await req.text()

  // ── 2. Verifier la signature ─────────────────────────────────────────────
  const signature = req.headers.get('x-flowmerce-signature') ?? ''
  if (!signature || !verifySignature(rawBody, signature)) {
    console.warn('[flowmerce:webhook] signature invalide')
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  // ── 3. Parser ────────────────────────────────────────────────────────────
  let event: FlowmerceEvent
  try { event = JSON.parse(rawBody) }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }

  const claimId  = event.claim?.id
  const rawState = event.claim?.status?.toUpperCase()
  if (!claimId || !rawState) {
    return NextResponse.json({ error: 'Payload incomplet' }, { status: 400 })
  }

  const newStatus =
    rawState === 'APPROVED' ? 'APPROVED' :
    rawState === 'REJECTED' ? 'REJECTED' :
    rawState === 'PENDING'  ? 'PENDING'  : null

  if (!newStatus) {
    // Status inconnu — on accuse reception sans planter pour ne pas faire
    // re-essayer Flowmerce indefiniment.
    console.warn('[flowmerce:webhook] status inconnu', { claimId, rawState })
    return NextResponse.json({ ok: true, ignored: true })
  }

  // ── 4. Mise a jour idempotente ───────────────────────────────────────────
  // updateMany ne plante pas si aucune ligne (claim cree hors CabaStore).
  const result = await prisma.returnRequest.updateMany({
    where: { flowmerceClaimId: claimId },
    data:  { status: newStatus },
  })

  if (result.count === 0) {
    console.warn('[flowmerce:webhook] claim inconnu localement', { claimId })
  }

  return NextResponse.json({ ok: true, updated: result.count })
}

// ─────────────────────────────────────────────────────────────────────────────

function verifySignature(rawBody: string, headerSignature: string): boolean {
  // Le header peut etre soit "<hex>" soit "sha256=<hex>" — on supporte les deux.
  const provided = headerSignature.startsWith('sha256=')
    ? headerSignature.slice(7)
    : headerSignature

  const expected = createHmac('sha256', FLOWMERCE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  if (provided.length !== expected.length) return false

  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
```

---

## 11. Composant formulaire dynamique — `FlowmerceReturnForm.tsx`

Composant client qui orchestre tout :
1. `GET /api/retours/form` → définition JSON du formulaire (cache serveur 5 min)
2. Rendu automatique via `fields.map(...)` — aucun champ codé en dur
3. Validation pilotée par le JSON (`lib/flowmerce-validation`)
4. Upload des fichiers (image / video / file / signature…) → URL
5. `POST /api/retours/submit` avec `{ orderId, productId, answers }`

États gérés : chargement, erreur réseau, erreur API, formulaire vide,
version incompatible, upload en cours, soumission, succès.

```tsx
'use client'

// components/retours/flowmerce/FlowmerceReturnForm.tsx
//
// Formulaire de retour dynamique piloté par Flowmerce :
//   1. GET /api/retours/form → définition JSON du formulaire (mise en cache serveur)
//   2. Rendu automatique via fields.map(...) — aucun champ codé en dur
//   3. Validation pilotée par le JSON (lib/flowmerce-validation)
//   4. Upload des fichiers (image / video / file / signature…) → URL
//   5. POST /api/retours/submit avec { orderId, productId, answers }
//
// États gérés : chargement, erreur réseau, erreur API, formulaire vide,
// version incompatible, upload en cours, soumission en cours, succès.

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, PackageX, Send } from 'lucide-react'
import type { ReturnForm, ReturnAnswer, ReturnSubmissionResult } from '@/lib/flowmerce-types'
import { SUPPORTED_FORM_VERSIONS } from '@/lib/flowmerce-types'
import { validateForm } from '@/lib/flowmerce-validation'
import DynamicField, { type UploadFn } from './DynamicField'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; retryable: boolean }
  | { kind: 'empty' }
  | { kind: 'incompatible'; version: number }
  | { kind: 'ready'; form: ReturnForm }

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; result: ReturnSubmissionResult }
  | { kind: 'error'; message: string }

interface FlowmerceReturnFormProps {
  orderId: string
  productId: string
  onSuccess?: (result: ReturnSubmissionResult) => void
}

export default function FlowmerceReturnForm({ orderId, productId, onSuccess }: FlowmerceReturnFormProps) {
  const [loadState,  setLoadState]  = useState<LoadState>({ kind: 'loading' })
  const [answers,    setAnswers]    = useState<ReturnAnswer>({})
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' })

  // ── Chargement de la définition du formulaire (aucun setState synchrone) ──
  const fetchForm = useCallback(async (): Promise<LoadState> => {
    try {
      const res  = await fetch('/api/retours/form', { cache: 'no-store' })
      const data = await res.json().catch(() => ({})) as { form?: ReturnForm; error?: string }

      if (!res.ok || !data.form) {
        return { kind: 'error', message: data.error ?? 'Impossible de charger le formulaire', retryable: res.status >= 500 || res.status === 429 }
      }

      const form = data.form

      // Version incompatible — le formulaire est piloté par Flowmerce,
      // Caba Store ne peut pas afficher une version qu'il ne connaît pas.
      if (!SUPPORTED_FORM_VERSIONS.includes(form.version as typeof SUPPORTED_FORM_VERSIONS[number])) {
        return { kind: 'incompatible', version: form.version }
      }

      if (!Array.isArray(form.fields) || form.fields.length === 0) {
        return { kind: 'empty' }
      }

      return { kind: 'ready', form }
    } catch {
      return { kind: 'error', message: 'Erreur réseau, vérifiez votre connexion.', retryable: true }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchForm().then(state => {
      if (cancelled) return
      setLoadState(state)
      if (state.kind === 'ready') {
        // Valeurs par défaut fournies par le JSON Flowmerce
        const defaults: ReturnAnswer = {}
        for (const field of state.form.fields) {
          if (field.defaultValue !== undefined) defaults[field.id] = field.defaultValue
        }
        if (Object.keys(defaults).length > 0) setAnswers(defaults)
      }
    })
    return () => { cancelled = true }
  }, [fetchForm])

  const handleRetry = () => {
    setLoadState({ kind: 'loading' })
    void fetchForm().then(state => {
      setLoadState(state)
      if (state.kind === 'ready') {
        const defaults: ReturnAnswer = {}
        for (const field of state.form.fields) {
          if (field.defaultValue !== undefined) defaults[field.id] = field.defaultValue
        }
        if (Object.keys(defaults).length > 0) setAnswers(defaults)
      }
    })
  }

  // ── Upload d'un fichier → URL (prêt pour la future API d'upload Flowmerce) ─
  const uploadFile: UploadFn = useCallback(async (field, file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fieldId', field.id)

    const res = await fetch('/api/retours/upload', {
      method:  'POST',
      body:    formData,
      signal:  AbortSignal.timeout(60_000),
    })
    const data = await res.json().catch(() => ({})) as { url?: string; error?: string }

    if (!res.ok || !data.url) {
      throw new Error(data.error ?? 'Échec de l\u2019upload')
    }
    return data.url
  }, [])

  const setAnswer = useCallback((fieldId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
    setErrors(prev => {
      if (!(fieldId in prev)) return prev
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }, [])

  // ── Soumission ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (loadState.kind !== 'ready' || submitState.kind === 'submitting') return

    const validationErrors = validateForm(loadState.form.fields, answers)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitState({ kind: 'submitting' })
    try {
      const res = await fetch('/api/retours/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId, productId, answers }),
      })
      const data = await res.json().catch(() => ({})) as { claimId?: string; status?: string; error?: string }

      if (!res.ok) {
        setSubmitState({ kind: 'error', message: data.error ?? 'Erreur lors de l\u2019envoi de la demande' })
        return
      }

      const result: ReturnSubmissionResult = { claimId: data.claimId ?? '', status: data.status }
      setSubmitState({ kind: 'success', result })
      onSuccess?.(result)
    } catch {
      setSubmitState({ kind: 'error', message: 'Erreur réseau, réessayez.' })
    }
  }

  // ── Rendu par état ─────────────────────────────────────────────────────────

  if (loadState.kind === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 py-14 text-stone-500 dark:text-stone-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement du formulaire…</span>
      </div>
    )
  }

  if (loadState.kind === 'error') {
    return (
      <StateCard
        icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
        title="Formulaire indisponible"
        message={loadState.message}
      >
        {loadState.retryable && (
          <button onClick={handleRetry} className="px-5 py-2 bg-orange-700 hover:bg-orange-800 text-white rounded-xl text-sm font-semibold transition">
            Réessayer
          </button>
        )}
      </StateCard>
    )
  }

  if (loadState.kind === 'empty') {
    return (
      <StateCard
        icon={<PackageX className="w-8 h-8 text-stone-400" />}
        title="Aucun formulaire disponible"
        message="Le formulaire de retour n'est pas encore disponible pour cette boutique. Réessayez plus tard."
      />
    )
  }

  if (loadState.kind === 'incompatible') {
    return (
      <StateCard
        icon={<AlertTriangle className="w-8 h-8 text-amber-500" />}
        title="Version du formulaire non prise en charge"
        message={`Ce formulaire utilise une version (v${loadState.version}) plus récente que celle supportée par Caba Store. Contactez le support.`}
      />
    )
  }

  if (submitState.kind === 'success') {
    const status = submitState.result.status?.toUpperCase()
    return (
      <div className="bg-green-50 dark:bg-green-950 rounded-2xl p-6 border border-green-200 dark:border-green-800 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-1">Demande enregistrée</h3>
        <p className="text-sm text-green-700 dark:text-green-400">
          {status === 'APPROVED' ? 'Votre retour a été approuvé.' :
           status === 'REJECTED' ? 'Votre retour a été refusé.' :
           'Votre demande est en attente de traitement.'}
        </p>
        {submitState.result.claimId && (
          <p className="text-xs font-mono text-green-700/70 dark:text-green-300/70 mt-2">Réf. {submitState.result.claimId}</p>
        )}
      </div>
    )
  }

  // ── Formulaire prêt ────────────────────────────────────────────────────────
  const form = loadState.form

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">{form.title}</h2>
        {form.description && (
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">{form.description}</p>
        )}
      </div>

      <div className="space-y-5">
        {form.fields.map(field => (
          <DynamicField
            key={field.id}
            field={field}
            value={answers[field.id]}
            error={errors[field.id]}
            onChange={value => setAnswer(field.id, value)}
            onUpload={uploadFile}
          />
        ))}
      </div>

      {submitState.kind === 'error' && (
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {submitState.message}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitState.kind === 'submitting'}
        className="w-full flex items-center justify-center gap-2 bg-orange-700 hover:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3.5 rounded-xl transition"
      >
        {submitState.kind === 'submitting'
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
          : <><Send className="w-4 h-4" /> Envoyer la demande de retour</>}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function StateCard({
  icon, title, message, children,
}: {
  icon: React.ReactNode
  title: string
  message: string
  children?: React.ReactNode
}) {
  return (
    <div className="text-center py-10">
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <h3 className="text-base font-bold text-stone-800 dark:text-stone-100 mb-1.5">{title}</h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto mb-5 leading-relaxed">{message}</p>
      {children}
    </div>
  )
}
```

---

## 12. Rendu dynamique des champs — `DynamicField.tsx`

Le seul endroit qui lit `field.type`. Le rendu est piloté **uniquement** par la
définition JSON : `fields.map(...)` + `switch`. 17 types de champs :

- Saisie : `text`, `email`, `tel`, `date`, `number`
- Choix : `select`, `radio`, `checkbox` (booléen seul ou multi-sélection), `switch`/`boolean`
- Fichiers : `image`, `video`, `file`, `barcode`, `qr` (avec capture caméra), `signature` (canvas → upload)

```tsx
'use client'

// components/retours/flowmerce/DynamicField.tsx
//
// Rendu dynamique d'un champ du formulaire de retour Flowmerce.
// Le rendu est piloté UNIQUEMENT par la définition JSON (field.type) :
// aucun champ, motif ou règle n'est codé en dur. fields.map(...) + switch.

import { useRef, useState } from 'react'
import { AlertCircle, Check, FileText, Loader2, Trash2, X } from 'lucide-react'
import type { ReturnField } from '@/lib/flowmerce-types'
import { acceptFor, formatBytes, normalizeOption, validateFileSelection } from '@/lib/flowmerce-validation'

export type UploadFn = (field: ReturnField, file: File) => Promise<string>

// ─── Styles partagés (cohérents avec le design Caba Store) ──────────────────
const inputCls = [
  'w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl',
  'px-3 py-2.5 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100',
  'placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-700 transition',
].join(' ')

const errorCls = 'border-red-400 dark:border-red-600'

interface DynamicFieldProps {
  field: ReturnField
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  onUpload: UploadFn
}

// ═════════════════════════════════════════════════════════════════════════════
//  Composant principal — aiguillage par type de champ
// ═════════════════════════════════════════════════════════════════════════════

export default function DynamicField({ field, value, error, onChange, onUpload }: DynamicFieldProps) {
  const label = field.label ?? field.id

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {label}
          {isRequired(field) && <span className="text-orange-600 dark:text-orange-500 ml-0.5">*</span>}
        </label>
      </div>

      <FieldInput field={field} value={value} error={error} onChange={onChange} onUpload={onUpload} />

      {field.helpText && (
        <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">{field.helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

function isRequired(field: ReturnField): boolean {
  return field.required === true || field.validation?.required === true
}

// ═════════════════════════════════════════════════════════════════════════════
//  Aiguillage par type — le seul endroit qui lit field.type
// ═════════════════════════════════════════════════════════════════════════════

function FieldInput(props: DynamicFieldProps) {
  const { field } = props

  switch (field.type) {
    case 'textarea':      return <TextareaField    {...props} />
    case 'select':        return <SelectField      {...props} />
    case 'radio':         return <RadioField       {...props} />
    case 'checkbox':      return <CheckboxField    {...props} />
    case 'switch':
    case 'boolean':       return <SwitchField      {...props} />
    case 'number':        return <InputField type="number" {...props} />
    case 'email':         return <InputField type="email"  {...props} />
    case 'tel':           return <InputField type="tel"    {...props} />
    case 'date':          return <InputField type="date"   {...props} />
    case 'image':         return <FileField accept="image/*" {...props} />
    case 'video':         return <FileField accept="video/*" {...props} />
    case 'file':          return <FileField accept={acceptFor(field)} {...props} />
    case 'barcode':       return <FileField accept="image/*" capture="environment" {...props} />
    case 'qr':            return <FileField accept="image/*" capture="environment" {...props} />
    case 'signature':     return <SignatureField {...props} />
    case 'text':
    default:              return <InputField type="text" {...props} />
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Champs de saisie (text / email / tel / date / number)
// ═════════════════════════════════════════════════════════════════════════════

function InputField({
  field, type, value, error, onChange,
}: DynamicFieldProps & { type: 'text' | 'email' | 'tel' | 'date' | 'number' }) {
  const rules = field.validation

  const handleChange = (raw: string) => {
    if (type === 'number') {
      onChange(raw === '' ? '' : Number(raw))
    } else {
      onChange(raw)
    }
  }

  return (
    <input
      type={type}
      value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
      placeholder={field.placeholder}
      min={type === 'number' ? rules?.min : undefined}
      max={type === 'number' ? rules?.max : undefined}
      maxLength={rules?.maxLength}
      onChange={e => handleChange(e.target.value)}
      className={`${inputCls} ${error ? errorCls : ''}`}
    />
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Textarea (avec compteur si maxLength fourni par le JSON)
// ═════════════════════════════════════════════════════════════════════════════

function TextareaField({ field, value, error, onChange }: DynamicFieldProps) {
  const maxLength = field.validation?.maxLength
  const text = typeof value === 'string' ? value : ''

  return (
    <div>
      <textarea
        value={text}
        placeholder={field.placeholder}
        rows={4}
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        className={`${inputCls} resize-none ${error ? errorCls : ''}`}
      />
      {maxLength != null && (
        <p className="text-[10px] text-stone-400 mt-1 text-right">{text.length}/{maxLength}</p>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Select
// ═════════════════════════════════════════════════════════════════════════════

function SelectField({ field, value, error, onChange }: DynamicFieldProps) {
  const options = (field.options ?? []).map(normalizeOption)

  return (
    <select
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      className={`${inputCls} ${error ? errorCls : ''}`}
    >
      <option value="" disabled>{field.placeholder ?? 'Sélectionnez…'}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Radio — options fournies par le JSON
// ═════════════════════════════════════════════════════════════════════════════

function RadioField({ field, value, error, onChange }: DynamicFieldProps) {
  const options = (field.options ?? []).map(normalizeOption)

  return (
    <div className={`grid gap-2 ${options.length > 2 ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
      {options.map(opt => {
        const selected = value === opt.value
        return (
          <label
            key={opt.value}
            className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer text-sm transition-all ${
              selected
                ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60'
                : 'border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
            } ${error ? 'border-red-400 dark:border-red-600' : ''}`}
          >
            <input
              type="radio"
              name={field.id}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="accent-orange-700 shrink-0"
            />
            <span className={`flex-1 leading-tight ${selected ? 'font-semibold text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-200'}`}>
              {opt.label}
            </span>
            {selected && <Check className="w-4 h-4 text-orange-700 shrink-0" />}
          </label>
        )
      })}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Checkbox — booléen seul, ou multi-sélection si options fournies
// ═════════════════════════════════════════════════════════════════════════════

function CheckboxField({ field, value, error, onChange }: DynamicFieldProps) {
  const options = (field.options ?? []).map(normalizeOption)

  // Cas 1 : case à cocher simple (réponse booléenne)
  if (options.length === 0) {
    return (
      <label className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer text-sm transition-all ${
        value === true
          ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60'
          : 'border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
      } ${error ? 'border-red-400 dark:border-red-600' : ''}`}>
        <input
          type="checkbox"
          checked={value === true}
          onChange={e => onChange(e.target.checked)}
          className="accent-orange-700 mt-0.5 shrink-0"
        />
        <span className="leading-tight text-stone-700 dark:text-stone-200">{field.helpText ?? field.label}</span>
      </label>
    )
  }

  // Cas 2 : multi-sélection (réponse = tableau de valeurs)
  const selected: string[] = Array.isArray(value) ? value : []

  const toggle = (optValue: string) => {
    onChange(selected.includes(optValue)
      ? selected.filter(v => v !== optValue)
      : [...selected, optValue])
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(opt => {
        const checked = selected.includes(opt.value)
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer text-sm transition-all ${
              checked
                ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60'
                : 'border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(opt.value)}
              className="accent-orange-700 mt-0.5 shrink-0"
            />
            <span className={`leading-tight ${checked ? 'font-semibold text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-200'}`}>
              {opt.label}
            </span>
          </label>
        )
      })}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Switch / Boolean — interrupteur
// ═════════════════════════════════════════════════════════════════════════════

function SwitchField({ field, value, error, onChange }: DynamicFieldProps) {
  const on = value === true

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={field.label ?? field.id}
      onClick={() => onChange(!on)}
      className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 cursor-pointer transition-all ${
        on ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60' : 'border-stone-100 dark:border-stone-800'
      } ${error ? 'border-red-400 dark:border-red-600' : ''}`}
    >
      <span className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-orange-700' : 'bg-stone-300 dark:bg-stone-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
      <span className={`text-sm font-medium ${on ? 'text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-200'}`}>
        {field.helpText ?? (on ? 'Oui' : 'Non')}
      </span>
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Fichiers (image / video / file / barcode / qr)
//  Sélection → upload → URL stockée dans answers. Prêt pour l'upload Flowmerce.
// ═════════════════════════════════════════════════════════════════════════════

function FileField({
  field, value, error, onChange, onUpload, accept, capture,
}: DynamicFieldProps & { accept?: string; capture?: 'environment' }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const multiple = field.multiple === true
  const values: string[] = Array.isArray(value) ? value : (typeof value === 'string' && value ? [value] : [])

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadError(null)

    for (const file of Array.from(files)) {
      const selectionError = validateFileSelection(field, file)
      if (selectionError) {
        setUploadError(selectionError)
        continue
      }

      setUploading(true)
      try {
        const url = await onUpload(field, file)
        if (multiple) {
          onChange([...new Set([...values, url])])
        } else {
          onChange(url)
        }
      } catch {
        setUploadError('Échec de l\'upload, réessayez.')
      } finally {
        setUploading(false)
      }
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (index: number) => {
    const next = values.filter((_, i) => i !== index)
    onChange(multiple ? next : next[0] ?? '')
  }

  return (
    <div>
      <div className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all ${error ? 'border-red-400 dark:border-red-600' : 'border-stone-200 dark:border-stone-700'}`}>
        {values.length === 0 && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex-1 text-sm text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-500 transition py-2"
          >
            {multiple ? 'Choisir des fichiers…' : 'Choisir un fichier…'}
            {field.validation?.maxFileSize != null && (
              <span className="block text-[10px] mt-0.5">Max {formatBytes(field.validation.maxFileSize)}</span>
            )}
          </button>
        )}
        {uploading && (
          <span className="flex-1 flex items-center justify-center gap-2 text-sm text-stone-500 dark:text-stone-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept ?? acceptFor(field)}
          capture={capture}
          multiple={multiple}
          className="sr-only"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {values.length > 0 && (
        <div className="mt-2 space-y-2">
          {values.map((url, index) => (
            <FilePreview key={url} url={url} onRemove={() => remove(index)} />
          ))}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
        </p>
      )}
    </div>
  )
}

function FilePreview({ url, onRemove }: { url: string; onRemove: () => void }) {
  const isImage = /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(url) || url.startsWith('data:image')
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg shrink-0" />
      )}
      {isVideo && (
        <video src={url} controls className="w-14 h-14 object-cover rounded-lg shrink-0" />
      )}
      {!isImage && !isVideo && (
        <div className="w-14 h-14 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-stone-400" />
        </div>
      )}
      <span className="flex-1 text-xs text-stone-500 dark:text-stone-400 truncate">{url}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-stone-400 hover:text-red-600 transition shrink-0"
        aria-label="Supprimer le fichier"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Signature — pad canvas, la signature est uploadée puis stockée en URL
// ═════════════════════════════════════════════════════════════════════════════

const SIGNATURE_WIDTH  = 560
const SIGNATURE_HEIGHT = 160

function SignatureField({ field, value, error, onChange, onUpload }: DynamicFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const signed = typeof value === 'string' && value !== ''

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const point = getPoint(e)
    if (!canvas || !ctx || !point) return
    ctx.strokeStyle = '#292524'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const point = getPoint(e)
    if (!ctx || !point) return
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  const stopDraw = () => { drawing.current = false }

  const confirm = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (isEmptyCanvas(canvas)) return

    const dataUrl = canvas.toDataURL('image/png')
    setUploading(true)
    setUploadError(null)
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'signature.png', { type: 'image/png' })
      const url  = await onUpload(field, file)
      onChange(url)
    } catch {
      setUploadError('Échec de l\'envoi de la signature, réessayez.')
    } finally {
      setUploading(false)
    }
  }

  const isEmptyCanvas = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return true
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return false
    }
    return true
  }

  return (
    <div>
      {signed ? (
        <div className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={String(value)} alt="Signature" className="h-14 object-contain shrink-0" />
          <span className="flex-1 text-xs text-green-600 dark:text-green-400 font-medium">Signature enregistrée</span>
          <button
            type="button"
            onClick={clear}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-stone-400 hover:text-red-600 transition shrink-0"
            aria-label="Effacer la signature"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className={`rounded-xl border-2 border-dashed overflow-hidden ${error ? 'border-red-400 dark:border-red-600' : 'border-stone-200 dark:border-stone-700'}`}>
          <canvas
            ref={canvasRef}
            width={SIGNATURE_WIDTH}
            height={SIGNATURE_HEIGHT}
            className="w-full bg-white dark:bg-stone-900 touch-none cursor-crosshair"
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={stopDraw}
            onPointerLeave={stopDraw}
          />
          <div className="flex items-center justify-between gap-2 p-2 bg-stone-50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
            <button type="button" onClick={clear} className="text-xs text-stone-500 hover:text-red-600 transition px-2 py-1">
              Effacer
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-semibold bg-orange-700 hover:bg-orange-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Valider la signature
            </button>
          </div>
        </div>
      )}
      {uploadError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
        </p>
      )}
    </div>
  )
}
```

---

## 13. Vue client — `ClientRetourView.tsx` (extrait clé)

Vue client en 3 étapes (stepper) : **Commande → Article → Formulaire**.
Plus aucun motif/champ/validation codé en dur. À l'étape 3, le formulaire
dynamique Flowmerce est monté avec `orderId` et `productId`.

```tsx
      {/* Étape 2 — Formulaire dynamique Flowmerce */}
      {step === 2 && selectedOrder && selectedItem && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-5">
          <FlowmerceReturnForm
            orderId={selectedOrder.id}
            productId={selectedItem.product.id}
            onSuccess={(result: ReturnSubmissionResult) => setResult({ success: true, ...result })}
          />
        </div>
      )}
```

Filtre des commandes éligibles (les commandes annulées et déjà retournées sont exclues ;
les doublons sont bloqués côté serveur par la contrainte unique sur `orderId`) :

```tsx
  useEffect(() => {
    fetch('/api/commandes/')
      .then(async r => {
        const data = await r.json()
        if (!r.ok || !Array.isArray(data)) return
        // Les commandes annulées sont exclues ; les commandes déjà retournées
        // sont bloquées par la contrainte unique côté serveur (orderId unique).
        const eligibles = (data as Order[]).filter(c => c.statut !== 'ANNULEE' && !c.retourDemande)
        setCommandes(eligibles)
        const pre = eligibles.find(c => c.id === preOrderId) ?? null
        if (pre) { setSelectedOrder(pre); setStep(1) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [preOrderId])
```

---

## 14. Page `/retours` — `app/retours/page.tsx`

Sélection de la vue selon le rôle (CLIENT → formulaire ; ADMIN/VENDEUR → dashboard).

```tsx
import { auth }     from '@/auth'
import { redirect } from 'next/navigation'

import ClientRetourView     from '@/components/retours/ClientRetourView'
import DashboardRetoursView from '@/components/retours/DashboardRetoursView'

export const dynamic = 'force-dynamic'

export default async function RetoursPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const role    = session.user.role as string
  const isAdmin = role === 'ADMIN'

  if (role === 'CLIENT') {
    const { orderId } = await searchParams
    return <ClientRetourView orderId={orderId ?? ''} />
  }

  if (isAdmin || role === 'VENDEUR') return <DashboardRetoursView isAdmin={isAdmin} />

  redirect('/')
}
```

---

## 15. Résumé des modifications (fichiers créés / modifiés)

| Fichier | Type | Rôle |
|---|---|---|
| `lib/flowmerce-types.ts` | **créé** | Types partagés client + serveur (`ReturnForm`, `ReturnField`, `ReturnAnswer`…) |
| `lib/flowmerce.ts` | **créé** | Client serveur Flowmerce : `getReturnForm()` (cache 5 min), `submitReturn()`, `FlowmerceError` |
| `lib/flowmerce-validation.ts` | **créé** | Validation 100 % pilotée par le JSON Flowmerce |
| `app/api/retours/form/route.ts` | **créé** | GET → renvoie la définition du formulaire depuis Flowmerce |
| `app/api/retours/submit/route.ts` | **réécrit** | Proxy POST → Flowmerce, lock applicatif, rollback, ownership check |
| `app/api/retours/upload/route.ts` | **créé** | Upload fichiers → future API Flowmerce ou repli Cloudinary |
| `app/api/retours/webhook/route.ts` | **créé** | Webhook HMAC SHA-256 de réconciliation des statuts |
| `components/retours/flowmerce/FlowmerceReturnForm.tsx` | **créé** | Formulaire dynamique (états, validation, upload, soumission) |
| `components/retours/flowmerce/DynamicField.tsx` | **créé** | Rendu des 17 types de champs (aucun champ codé en dur) |
| `components/retours/ClientRetourView.tsx` | **créé** | Stepper Commande → Article → Formulaire |
| `components/retours/DashboardRetoursView.tsx` | **créé** | Vue admin/vendeur des demandes de retour |
| `app/retours/page.tsx` | **créé** | Routage par rôle |
| `prisma/schema.prisma` | **modifié** | Modèle `ReturnRequest`, enum `ReturnRequestStatus`, `Order.retourDemande` |
| `prisma/migrations/20260731200000_drop_return_reason_required/` | **créé** | `reason` n'est plus NOT NULL (le motif appartient à Flowmerce) |
| `README.md` | **modifié** | Documentation architecture + variables d'env Flowmerce |
| `.env` | **modifié** | `FLOWMERCE_API_URL`, `FLOWMERCE_API_KEY`, `FLOWMERCE_WEBHOOK_SECRET`, `FLOWMERCE_UPLOAD_URL` (`FLOWMERCE_SHOP_ID` supprimée) |

---

## 16. Historique Git des modifications Flowmerce

```
64a07b6 bouton retour android/kill admin session
2ccc572 retourner
1413536 enrichi les information du retours
26f321d retours, (non complet)
5a416dc delete retour route
f28438f delete retour route reste
2ef59e2 retour
8be304e Centralize Flowmerce returns + webhook
5f98c64 Format admin clients and update Flowmerce URL
c42e980 Tester avec flowmerce
fccd1e6 adapté vc Flowmerce
f64ffa0 fix call flowmerce
753d1ec fix url flowmerce
```

---

## 17. Points importants à retenir

1. **Flowmerce est l'unique source de vérité** : ni le formulaire, ni les motifs,
   ni les validations ne sont codés en dur dans Caba Store.
2. **Nouvelle API sans identifiant de boutique** : le formulaire est chargé via
   `GET /api/v1/return-form` avec `Authorization: Bearer FLOWMERCE_API_KEY` uniquement.
   Aucun `shopSlug`, `shopId`, Vendor ni ReturnPolicy n'est transmis par Caba Store —
   Flowmerce retrouve automatiquement le Vendor associé à la clé.
3. **Sécurité** : la `FLOWMERCE_API_KEY` reste côté serveur ; le webhook est signé
   HMAC SHA-256 (`x-flowmerce-signature`) avec comparaison en temps constant.
4. **Anti-doublon** : contrainte unique sur `orderId` (lock applicatif) + `retourDemande` sur la commande.
5. **Rollback** : si Flowmerce refuse (422) ou est indisponible, le `ReturnRequest`
   local est supprimé pour permettre un retry propre.
6. **Cache** : la définition du formulaire est mise en cache 5 minutes côté serveur.
7. **Versionning** : si Flowmerce renvoie une version de formulaire non supportée
   (`SUPPORTED_FORM_VERSIONS`), un écran dédié l'explique à l'utilisateur.
8. **Upload prêt pour Flowmerce** : basculer `FLOWMERCE_UPLOAD_URL` suffit pour
   envoyer les fichiers à l'API d'upload Flowmerce au lieu de Cloudinary.
9. **Gestion des erreurs** : clé absente (503), clé invalide (401), formulaire
   introuvable / politique inexistante (404), réseau / timeout (503 TIMEOUT/NETWORK)
   → messages utilisateur affichés avec bouton « Réessayer » quand c'est retryable.
