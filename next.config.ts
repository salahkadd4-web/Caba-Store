import type { NextConfig } from 'next'

// ─── Security Headers HTTP ────────────────────────────────────────────────────
// Appliqués à toutes les réponses via next.config.
// Le middleware applique les mêmes headers sur les routes qu'il intercepte ;
// next.config les applique sur le reste (pages statiques, assets…).
const securityHeaders = [
  // Empêche le MIME-type sniffing
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  // Empêche l'intégration dans une iframe (clickjacking)
  { key: 'X-Frame-Options',         value: 'DENY' },
  // Protection XSS intégrée aux navigateurs anciens
  { key: 'X-XSS-Protection',        value: '1; mode=block' },
  // Contrôle les informations envoyées dans le Referer
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  // Désactive micros / caméra / géolocalisation non utilisés
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS pendant 2 ans (HSTS) — activé uniquement en production
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []
  ),
]

const nextConfig: NextConfig = {
  trailingSlash: true,

  // ── Security headers sur toutes les routes ──────────────────────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // ── Résolution des alias "node:" pour Turbopack (Next.js 16+) ──────────────
  turbopack: {
    resolveAlias: {
      'node:crypto': 'crypto',
      'node:stream': 'stream',
      'node:buffer': 'buffer',
      'node:util':   'util',
      'node:events': 'events',
    },
  },

  // ── Fallback webpack ────────────────────────────────────────────────────────
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:crypto': 'crypto',
        'node:stream': 'stream',
        'node:buffer': 'buffer',
        'node:util':   'util',
        'node:events': 'events',
      }
    }
    return config
  },
}

export default nextConfig
