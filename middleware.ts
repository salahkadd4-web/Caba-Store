// middleware.ts
// ⚠️  On importe UNIQUEMENT authConfig (sans Prisma ni bcryptjs)
//     pour rester compatible avec l'Edge Runtime.
//     Le fichier auth.ts complet est réservé aux API routes / Server Components.

import NextAuth from 'next-auth'
import type { NextAuthRequest } from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

// ─── Security headers appliqués à chaque réponse ─────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options':    'nosniff',
  'X-Frame-Options':           'DENY',
  'X-XSS-Protection':          '1; mode=block',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value)
  }
  return res
}

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl
  const session      = req.auth

  // ── Bloquer /api/debug-auth en production ──────────────────────────────────
  if (pathname.startsWith('/api/debug-auth') && process.env.NODE_ENV === 'production') {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    )
  }

  // ── Routes admin : session + rôle ADMIN requis ────────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!session?.user) {
      if (pathname.startsWith('/api/')) {
        return applySecurityHeaders(
          NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        )
      }
      return NextResponse.redirect(new URL('/connexion', req.url))
    }
    if (session.user.role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return applySecurityHeaders(
          NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        )
      }
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // ── Routes vendeur : session + rôle VENDEUR requis ───────────────────────
  // La vérification du statut (EN_ATTENTE / SUSPENDU / PIECES_REQUISES)
  // est gérée dans chaque page/layout via VendeurGuard côté serveur.
  if (pathname.startsWith('/vendeur') || pathname.startsWith('/api/vendeur')) {
    if (!session?.user) {
      if (pathname.startsWith('/api/')) {
        return applySecurityHeaders(
          NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        )
      }
      return NextResponse.redirect(new URL('/connexion', req.url))
    }
    if (session.user.role !== 'VENDEUR') {
      if (pathname.startsWith('/api/')) {
        return applySecurityHeaders(
          NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        )
      }
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // ── Routes dashboard partagées /commandes et /retours ────────────────────
  // Accessibles aux ADMIN et VENDEUR uniquement (pages Next.js du groupe (dashboard))
  const isDashboardShared =
    pathname.startsWith('/commandes') || pathname.startsWith('/retours')

  if (isDashboardShared) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/connexion', req.url))
    }
    const role = session.user.role
    if (role !== 'ADMIN' && role !== 'VENDEUR') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // ── Routes client protégées : session requise (pages) ────────────────────
  const protectedClientPages = ['/panier', '/favoris', '/profil']
  if (protectedClientPages.some(r => pathname.startsWith(r)) && !session?.user) {
    return NextResponse.redirect(new URL('/connexion', req.url))
  }

  // ── API client protégées : session requise ────────────────────────────────
  const protectedApiRoutes = [
    '/api/panier',
    '/api/favoris',
    '/api/profil',
    '/api/commandes',
    '/api/retours',
    '/api/upload',
  ]
  if (protectedApiRoutes.some(r => pathname.startsWith(r)) && !session?.user) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    )
  }

  // ── Laisser passer + appliquer security headers ───────────────────────────
  return applySecurityHeaders(NextResponse.next())
})

export const config = {
  matcher: [
    // Dashboard admin — racine + sous-routes (trailingSlash génère /admin/)
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*',
    // Dashboard vendeur — racine + sous-routes
    '/vendeur',
    '/vendeur/:path*',
    '/api/vendeur/:path*',
    // Routes dashboard partagées
    '/commandes',
    '/commandes/:path*',
    '/retours',
    '/retours/:path*',
    // Routes client protégées
    '/panier',
    '/panier/:path*',
    '/favoris',
    '/favoris/:path*',
    '/profil',
    '/profil/:path*',
    // API client protégées
    '/api/panier/:path*',
    '/api/favoris/:path*',
    '/api/profil/:path*',
    '/api/commandes/:path*',
    '/api/retours/:path*',
    '/api/upload',
    // Debug (bloqué en prod)
    '/api/debug-auth',
  ],
}
