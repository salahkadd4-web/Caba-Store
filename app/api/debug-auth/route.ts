import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
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
    issues.push('AUTH_SECRET manquant → JWT impossible → Configuration error')
  if (!envCheck.DATABASE_URL)
    issues.push('DATABASE_URL manquant → Prisma ne peut pas se connecter')
  if (!envCheck.GOOGLE_CLIENT_ID)
    issues.push('GOOGLE_CLIENT_ID manquant → Google login impossible')
  if (!envCheck.GOOGLE_CLIENT_SECRET)
    issues.push('GOOGLE_CLIENT_SECRET manquant → Google login impossible')
  if (typeof envCheck.NEXTAUTH_URL === 'string' && envCheck.NEXTAUTH_URL.includes('localhost'))
    issues.push('NEXTAUTH_URL pointe vers localhost → doit être https://caba-store.vercel.app')
  if (envCheck.AUTH_TRUST_HOST === '❌ MANQUANT')
    issues.push('AUTH_TRUST_HOST manquant → mettre "true" dans Vercel')
  if (prismaStatus.startsWith('❌'))
    issues.push(`Prisma connection failed: ${prismaStatus}`)

  return NextResponse.json({
    status:     issues.length === 0 ? '✅ Tout OK' : '❌ Problèmes détectés',
    issues,
    env:        envCheck,
    prisma:     prismaStatus,
    userCount,
    timestamp:  new Date().toISOString(),
  }, { status: 200 })
}