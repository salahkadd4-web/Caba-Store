import type { NextConfig } from 'next'
import { lireCloudName } from './lib/cloudinary-account'

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
  skipTrailingSlashRedirect: true,

  // ── Security headers sur toutes les routes ──────────────────────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },

  // ── Images ──────────────────────────────────────────────────────────────────
  // Un seul optimiseur par requête : Next.js / Vercel (AVIF/WebP, q=75).
  // Cloudinary stocke des originaux déjà normalisés à l'upload (≤ 1200 px, q_auto,
  // cf. app/api/upload/route.ts) : on ne lui demande aucune transformation de plus.
  images: {
    formats: ['image/avif', 'image/webp'],
    // Les originaux font au plus 1200 px : au-delà, chaque largeur produisait le
    // même fichier (vérifié en production : 1200, 1920, 3840 → mêmes octets) pour
    // une transformation et une entrée de cache Vercel de plus.
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    // URLs Cloudinary versionnées (v123/…) et immuables : 30 jours, comme le
    // max-age envoyé par Cloudinary. S'applique aussi aux avatars Google / Blob.
    minimumCacheTTL: 2_592_000,
    remotePatterns: [
      // Restreint au compte Caba Store : /_next/image ne transforme pas les images
      // d'autres comptes Cloudinary à nos frais.
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        // Nom nettoyé (trim) et validé ; absent ou invalide → compte par défaut,
        // jamais un filtre ouvert à tous les comptes (cf. lib/cloudinary-account.ts).
        pathname: `/${lireCloudName()}/**`,
      },
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
