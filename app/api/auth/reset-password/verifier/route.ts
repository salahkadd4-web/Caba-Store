import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOTP } from '@/lib/twilio'
import { rateLimit, rateLimits, sanitize } from '@/lib/security'

export async function POST(req: NextRequest) {
  // Rate limiting strict : 5 tentatives / 10 min
  const limited = await rateLimit(req, rateLimits.otp)
  if (limited) return limited

  try {
    const body       = await req.json()
    const identifiant = sanitize(body.identifiant).toLowerCase()
    const code        = sanitize(body.code)

    if (!identifiant || !code) {
      return NextResponse.json({ error: 'Identifiant et code requis' }, { status: 400 })
    }

    // Validation format : 6 chiffres uniquement
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Le code doit contenir 6 chiffres' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email:     identifiant },
          { telephone: identifiant },
        ],
      },
    })

    // Réponse identique que l'user existe ou non (anti-énumération)
    if (!user) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    // ── Vérification email ─────────────────────────────────
    if (user.email && identifiant === user.email) {
      const resetToken = await prisma.resetToken.findFirst({
        where: {
          userId:    user.id,
          code:      code,        // ← compare le code 6 chiffres directement
          used:      false,
          verified:  false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!resetToken) {
        return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
      }

      // Marquer comme vérifié — /nouveau lira ce flag
      await prisma.resetToken.update({
        where: { id: resetToken.id },
        data:  { verified: true },
      })
    }

    // ── Vérification téléphone (Twilio Verify) ─────────────
    if (user.telephone && identifiant === user.telephone) {
      const isValid = await verifyOTP(user.telephone, code)
      if (!isValid) {
        return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
      }

      await prisma.resetToken.updateMany({
        where: {
          userId:    user.id,
          used:      false,
          verified:  false,
          expiresAt: { gt: new Date() },
        },
        data: { verified: true },
      })
    }

    // Ne PAS retourner userId — la sécurité repose sur verified=true en DB
    return NextResponse.json({ message: 'Code valide' })

  } catch (error) {
    console.error('Erreur reset vérifier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
