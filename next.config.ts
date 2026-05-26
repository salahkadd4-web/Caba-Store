import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // ── Résolution des alias "node:" pour Turbopack (Next.js 16+) ──────────
  turbopack: {
    resolveAlias: {
      'node:crypto': 'crypto',
      'node:stream': 'stream',
      'node:buffer': 'buffer',
      'node:util':   'util',
      'node:events': 'events',
    },
  },

  // ── Fallback webpack ────────────────────────────────────────────────────
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