import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sanitize } from '@/lib/security'
import { getI18n } from '@/lib/i18n/server'

const pwdRules = [
  (p: string) => p.length >= 8,
  (p: string) => /[A-Z]/.test(p),
  (p: string) => /[a-z]/.test(p),
  (p: string) => /[0-9]/.test(p),
  (p: string) => /[^A-Za-z0-9]/.test(p),
]

export async function POST(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const body = await req.json()
    const identifiant      = sanitize(body.identifiant ?? '').toLowerCase()
    const nouveauMotDePasse = body.nouveauMotDePasse as string ?? ''

    if (!identifiant || !nouveauMotDePasse) {
      return NextResponse.json({ error: t.auth.api.missingData }, { status: 400 })
    }

    // Validation mot de passe (8+ chars, maj, min, chiffre, spécial)
    if (!pwdRules.every(r => r(nouveauMotDePasse))) {
      return NextResponse.json(
        { error: t.auth.api.passwordNotSecure },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email:     identifiant },
          { telephone: identifiant },
        ],
      },
    })

    if (!user) {
      return NextResponse.json({ error: t.auth.api.accountNotFound }, { status: 400 })
    }

    // ── Vérifier que /verifier a bien validé le code (verified=true) ─────────
    // Sans ce check, n'importe qui connaissant un email pourrait appeler /nouveau
    const resetToken = await prisma.resetToken.findFirst({
      where: {
        userId:    user.id,
        used:      false,
        verified:  true,          // ← exige que /verifier ait été passé
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: t.auth.api.resetSessionExpired },
        { status: 400 }
      )
    }

    // Consommer le token (une seule utilisation)
    await prisma.resetToken.update({
      where: { id: resetToken.id },
      data:  { used: true },
    })

    // Mettre à jour le mot de passe
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 12)
    await prisma.user.update({
      where: { id: user.id },
      data:  { motDePasse: hashedPassword },
    })

    return NextResponse.json({ message: t.auth.api.passwordUpdated })
  } catch (error) {
    console.error('Erreur reset nouveau:', error)
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
