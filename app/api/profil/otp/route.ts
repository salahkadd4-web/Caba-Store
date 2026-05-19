import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { sendIdentityOtpEmail } from '@/lib/mail'
import crypto from 'crypto'

// Identifiant de stockage OTP profil
const otpKey = (userId: string) => `otp_profil_${userId}`

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { action } = await req.json()

    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { id: true, email: true, prenom: true, motDePasse: true },
    })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    // Seuls les comptes sans mot de passe (Google) utilisent ce mécanisme
    if (user.motDePasse) {
      return NextResponse.json(
        { error: 'Votre compte possède un mot de passe, utilisez-le pour confirmer.' },
        { status: 400 }
      )
    }

    if (action === 'send') {
      if (!user.email) {
        return NextResponse.json({ error: 'Aucun email associé à ce compte' }, { status: 400 })
      }

      const code      = crypto.randomInt(100000, 999999).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      // Supprimer tout OTP précédent
      await prisma.otpToken.deleteMany({ where: { identifiant: otpKey(user.id) } })

      // Stocker le nouveau
      await prisma.otpToken.create({
        data: { identifiant: otpKey(user.id), token: code, data: '{}', expiresAt },
      })

      await sendIdentityOtpEmail(user.email, code, user.prenom ?? 'Utilisateur')

      return NextResponse.json({ message: 'Code envoyé à votre email.' })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (err) {
    console.error('Erreur OTP profil:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Utilitaire : vérifie et consomme un OTP profil.
 * Appelé depuis d'autres routes (PATCH profil, POST password…).
 */
export async function verifyAndConsumeProfileOtp(userId: string, otp: string): Promise<boolean> {
  const record = await prisma.otpToken.findFirst({
    where: { identifiant: otpKey(userId), expiresAt: { gt: new Date() } },
  })
  if (!record || record.token !== otp) return false
  await prisma.otpToken.delete({ where: { id: record.id } })
  return true
}