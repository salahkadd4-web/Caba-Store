/**
 * lib/security.ts
 * Utilitaires de sécurité centralisés — rate limiting, validation, auth guards.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis }     from '@upstash/redis'
import { auth }      from '@/auth'

// ══════════════════════════════════════════════════════════════
//  1. RATE LIMITING — Upstash Redis (sliding window)
//  Persistant et partagé entre toutes les instances serverless.
// ══════════════════════════════════════════════════════════════

interface RateLimitOptions {
  maxRequests: number
  windowMs:    number
}

const upstashConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const redis = upstashConfigured ? Redis.fromEnv() : null

// Mémoïsation des instances Ratelimit par config
const limiterCache = new Map<string, Ratelimit>()

function getLimiter(options: RateLimitOptions): Ratelimit | null {
  if (!redis) return null
  const key = `${options.maxRequests}:${options.windowMs}`
  let limiter = limiterCache.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(options.maxRequests, `${options.windowMs} ms`),
      analytics: false,
      prefix:    'caba:rl',
    })
    limiterCache.set(key, limiter)
  }
  return limiter
}

export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
             || req.headers.get('x-real-ip')
             || 'unknown'

  const limiter = getLimiter(options)

  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[rateLimit] Upstash non configuré — requête laissée passer en PROD')
    }
    return null
  }

  const identifier = `${ip}:${req.nextUrl.pathname}`
  const result     = await limiter.limit(identifier)

  if (!result.success) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques instants.' },
      {
        status: 429,
        headers: {
          'Retry-After':           String(retryAfter),
          'X-RateLimit-Limit':     String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset':     String(Math.ceil(result.reset / 1000)),
        },
      }
    )
  }

  return null
}

// Presets pour les endpoints sensibles
export const rateLimits = {
  auth:          { maxRequests: 5,   windowMs: 15 * 60 * 1000 }, // 5/15min — connexion, inscription
  passwordReset: { maxRequests: 3,   windowMs: 60 * 60 * 1000 }, // 3/h     — récupération mdp
  otp:           { maxRequests: 3,   windowMs: 10 * 60 * 1000 }, // 3/10min — vérification OTP
  api:           { maxRequests: 100, windowMs: 60 * 1000       }, // 100/min — API générale
  upload:        { maxRequests: 20,  windowMs: 60 * 60 * 1000 }, // 20/h    — upload images
}

// ══════════════════════════════════════════════════════════════
//  2. AUTH GUARDS — helpers unifiés pour les API routes
//  Utilisez-les en tête de chaque route handler pour éviter
//  la duplication de la logique d'autorisation.
// ══════════════════════════════════════════════════════════════

type AuthUser = {
  id:        string
  email?:    string | null
  role:      string
  telephone?: string | null
}

/**
 * requireAdmin — vérifie que la requête vient d'un ADMIN connecté.
 * Retourne { user } si OK, ou { error: NextResponse } à retourner immédiatement.
 *
 * @example
 * const guard = await requireAdmin()
 * if (guard.error) return guard.error
 * const { user } = guard
 */
export async function requireAdmin(): Promise<
  { user: AuthUser; error?: never } | { error: NextResponse; user?: never }
> {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }
  if (session.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }
  return { user: session.user as AuthUser }
}

/**
 * requireVendeur — vérifie que la requête vient d'un VENDEUR approuvé.
 * Effectue aussi la vérification du statut du profil vendeur en DB.
 * Retourne { user, vendeur } si OK, ou { error: NextResponse } à retourner immédiatement.
 *
 * @example
 * const guard = await requireVendeur()
 * if (guard.error) return guard.error
 * const { vendeur } = guard
 */
export async function requireVendeur(): Promise<
  | { user: AuthUser; vendeur: { id: string; statut: string; nomBoutique: string | null }; error?: never }
  | { error: NextResponse; user?: never; vendeur?: never }
> {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }
  if (session.user.role !== 'VENDEUR') {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }

  // Vérification du statut en DB (le middleware ne peut pas accéder à Prisma)
  const { prisma } = await import('@/lib/prisma')
  const vendeur = await prisma.vendeurProfile.findUnique({
    where:  { userId: session.user.id },
    select: { id: true, statut: true, nomBoutique: true },
  })

  if (!vendeur) {
    return { error: NextResponse.json({ error: 'Profil vendeur introuvable' }, { status: 403 }) }
  }
  if (vendeur.statut !== 'APPROUVE') {
    return { error: NextResponse.json({ error: 'Compte vendeur non approuvé' }, { status: 403 }) }
  }

  return { user: session.user as AuthUser, vendeur }
}

/**
 * requireAuth — vérifie uniquement qu'un utilisateur est connecté (tous rôles).
 */
export async function requireAuth(): Promise<
  { user: AuthUser; error?: never } | { error: NextResponse; user?: never }
> {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }
  return { user: session.user as AuthUser }
}

// ══════════════════════════════════════════════════════════════
//  3. VALIDATION ET SANITISATION
// ══════════════════════════════════════════════════════════════

/**
 * sanitize — nettoie une chaîne pour éviter XSS et injections basiques.
 * - Supprime les balises HTML (< >)
 * - Supprime les guillemets pouvant sortir d'un attribut HTML
 * - Limite la longueur à 500 caractères
 */
export function sanitize(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .slice(0, 500)
    .replace(/[<>]/g, '')          // évite <script>, <img onerror=...>
    .replace(/['"]/g, '')          // évite les sorties d'attributs HTML
    .replace(/javascript:/gi, '')  // évite javascript: dans les URLs
    .replace(/on\w+=/gi, '')       // évite onload=, onclick=, etc.
}

/**
 * sanitizeLong — pour les champs longs (description, note admin…), longueur max 2000.
 */
export function sanitizeLong(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .slice(0, 2000)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

// Validation email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

// Validation téléphone algérien
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, '')
  return /^(05|06|07)\d{8}$/.test(cleaned)
}

// Validation mot de passe fort
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

// Validation ID Prisma (cuid2 : 24 chars alphanumériques)
export function isValidId(id: unknown): boolean {
  return typeof id === 'string' && /^[a-z0-9]{20,30}$/.test(id)
}

// ══════════════════════════════════════════════════════════════
//  4. HEADERS DE SÉCURITÉ (utilisé dans les API routes si besoin)
// ══════════════════════════════════════════════════════════════
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options',    'nosniff')
  response.headers.set('X-Frame-Options',           'DENY')
  response.headers.set('X-XSS-Protection',          '1; mode=block')
  response.headers.set('Referrer-Policy',           'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy',        'camera=(), microphone=(), geolocation=()')
  return response
}

// ══════════════════════════════════════════════════════════════
//  5. OWNERSHIP — vérifier qu'un user accède à ses propres données
// ══════════════════════════════════════════════════════════════
export function isOwner(tokenId: string, resourceUserId: string): boolean {
  return tokenId === resourceUserId
}
