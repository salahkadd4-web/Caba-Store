import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ── Bloquer totalement en production ──────────────────────────────────────────
// Cette route expose des infos de configuration sensibles (env vars, DB count).
// Elle ne doit jamais être accessible en prod, même pour un admin connecté.
// Le middleware la bloque également via le matcher.
if (process.env.NODE_ENV === 'production') {
  // On exporte une fonction GET qui retourne 404 — le reste du fichier ne s'exécute pas.
  module.exports = {
    GET: () => new NextResponse(null, { status: 404 }),
  }
}

export async function GET() {
  // Double-vérification (au cas où le middleware serait bypassé)
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  // ── 1. Variables d'environnement ────────────────────────
  const envCheck = {
    AUTH_SECRET:            !!process.env.AUTH_SECRET,
    DATABASE_URL:           !!process.env.DATABASE_URL,
    DIRECT_URL:             !!process.env.DIRECT_URL,
    NEXTAUTH_URL:           process.env.NEXTAUTH_URL ?? '❌ MANQUANT',
    NEXT_PUBLIC_APP_URL:    process.env.NEXT_PUBLIC_APP_URL ?? '❌ MANQUANT',
    AUTH_TRUST_HOST:        process.env.AUTH_TRUST_HOST ?? '❌ MANQUANT',
    GOOGLE_CLIENT_ID:       !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET:   !!process.env.GOOGLE_CLIENT_SECRET,
    UPSTASH_CONFIGURED:     !!process.env.UPSTASH_REDIS_REST_URL,
    CRON_SECRET_SET:        !!process.env.CRON_SECRET,
    NODE_ENV:               process.env.NODE_ENV,
  }

  // ── 2. Test connexion Prisma ─────────────────────────────
  let prismaStatus: string
  let userCount: number | null = null
  try {
    const { prisma } = await import('@/lib/prisma')
    userCount    = await prisma.user.count()
    prismaStatus = '✅ OK'
  } catch (e: unknown) {
    prismaStatus = `❌ ${e instanceof Error ? e.message : String(e)}`
  }

  // ── 3. Diagnostic global ─────────────────────────────────
  const issues: string[] = []
  if (!envCheck.AUTH_SECRET)
    issues.push('AUTH_SECRET manquant → JWT impossible')
  if (!envCheck.DATABASE_URL)
    issues.push('DATABASE_URL manquant → Prisma KO')
  if (!envCheck.GOOGLE_CLIENT_ID || !envCheck.GOOGLE_CLIENT_SECRET)
    issues.push('GOOGLE_CLIENT_* manquant → Google login KO')
  if (typeof envCheck.NEXTAUTH_URL === 'string' && envCheck.NEXTAUTH_URL.includes('localhost'))
    issues.push('NEXTAUTH_URL pointe vers localhost — doit être https://caba-store.vercel.app')
  if (envCheck.AUTH_TRUST_HOST === '❌ MANQUANT')
    issues.push('AUTH_TRUST_HOST manquant → mettre "true" dans Vercel')
  if (!envCheck.UPSTASH_CONFIGURED)
    issues.push('Upstash non configuré → rate limiting désactivé')
  if (!envCheck.CRON_SECRET_SET)
    issues.push('CRON_SECRET manquant → routes cron non protégées')
  if (prismaStatus.startsWith('❌'))
    issues.push(`Prisma KO : ${prismaStatus}`)

  return NextResponse.json({
    status:    issues.length === 0 ? '✅ Tout OK' : '❌ Problèmes détectés',
    issues,
    env:       envCheck,
    prisma:    prismaStatus,
    userCount,
    timestamp: new Date().toISOString(),
  })
}
