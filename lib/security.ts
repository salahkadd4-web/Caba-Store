/**
 * lib/security.ts
 * Utilitaires de sécurité centralisés
 */

import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ══════════════════════════════════════════════════════════════
//  1. RATE LIMITING — Upstash Redis (sliding window)
//  Persistant et partagé entre toutes les instances serverless.
// ══════════════════════════════════════════════════════════════
interface RateLimitOptions {
  maxRequests: number  // nombre max de requêtes
  windowMs:    number  // fenêtre en ms
}

const upstashConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const redis = upstashConfigured ? Redis.fromEnv() : null

// Un seul Ratelimit par config (mémoïsation par "maxRequests:windowMs")
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

  // Sans Redis configuré (ex: dev local sans .env complet), on ne bloque pas
  // pour éviter de casser l'app — mais on log pour que ce ne soit pas silencieux.
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
  auth:          { maxRequests: 5,   windowMs: 15 * 60 * 1000 }, // 5/15min → connexion, inscription
  passwordReset: { maxRequests: 3,   windowMs: 60 * 60 * 1000 }, // 3/h → récupération mdp
  otp:           { maxRequests: 3,   windowMs: 10 * 60 * 1000 }, // 3/10min → vérification OTP
  api:           { maxRequests: 100, windowMs: 60 * 1000        }, // 100/min → API générale
  upload:        { maxRequests: 20,  windowMs: 60 * 60 * 1000 }, // 20/h → upload images
}

// ══════════════════════════════════════════════════════════════
//  2. VALIDATION ET SANITISATION
// ══════════════════════════════════════════════════════════════

// Nettoyage des chaînes de caractères
export function sanitize(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .slice(0, 500) // longueur max
    .replace(/[<>]/g, '') // éviter XSS basique
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

// Validation ID Prisma (cuid format)
export function isValidId(id: string): boolean {
  return typeof id === 'string' && /^[a-z0-9]{20,30}$/.test(id)
}

// ══════════════════════════════════════════════════════════════
//  3. HEADERS DE SÉCURITÉ
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
//  4. VÉRIFICATION OWNERSHIP
//  S'assurer qu'un utilisateur accède seulement à ses données
// ══════════════════════════════════════════════════════════════
export function isOwner(tokenId: string, resourceUserId: string): boolean {
  return tokenId === resourceUserId
}
