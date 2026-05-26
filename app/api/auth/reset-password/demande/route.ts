import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendResetEmail } from '@/lib/mail'
import { sendOTP } from '@/lib/twilio'
import { rateLimit, rateLimits, sanitize } from '@/lib/security'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  // ── Rate limiting strict — 3 tentatives / heure ───────
  const limited = await rateLimit(req, rateLimits.passwordReset)
  if (limited) return limited

  try {
    const body = await req.json()
    const identifiant = sanitize(body.identifiant).toLowerCase()

    if (!identifiant) {
      return NextResponse.json({ error: 'Email ou téléphone requis' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifiant }, { telephone: identifiant }] },
    })

    // Réponse identique que l'utilisateur existe ou non (anti-énumération)
    if (!user) {
      return NextResponse.json({ message: 'Code envoyé si le compte existe' })
    }

    // Invalider les anciens tokens
    await prisma.resetToken.updateMany({
      where: { userId: user.id, used: false },
      data:  { used: true },
    })

    // Envoi selon le type d'identifiant
    if (user.email && identifiant === user.email) {
      // ── CORRECTION : code 6 chiffres lisible, token interne séparé ────────
      const code6    = Math.floor(100000 + Math.random() * 900000).toString()
      const token    = crypto.randomBytes(32).toString('hex') // ID interne uniquement
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

      await prisma.resetToken.create({
        data: { token, code: code6, userId: user.id, expiresAt },
      })

      // Envoie le code 6 chiffres, PAS le token hex
      await sendResetEmail(user.email, code6)

    } else if (user.telephone && identifiant === user.telephone) {
      // Pour le téléphone, Twilio génère son propre code — on crée quand même
      // un ResetToken pour pouvoir marquer verified=true après validation
      const token    = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      await prisma.resetToken.create({
        data: { token, code: '', userId: user.id, expiresAt },
      })

      await sendOTP(user.telephone)
    }

    return NextResponse.json({ message: 'Code envoyé si le compte existe' })
  } catch (error) {
    console.error('Erreur reset password:', error)
    return NextResponse.json({ message: 'Code envoyé si le compte existe' })
  }
}
