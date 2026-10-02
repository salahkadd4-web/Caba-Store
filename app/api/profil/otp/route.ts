import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { sendIdentityOtpEmail } from '@/lib/mail'
import { profileOtpKey } from '@/lib/profileOtp'
import crypto from 'crypto'
import { getI18n } from '@/lib/i18n/server'

export async function POST(req: NextRequest) {
  const { t, locale } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const { action } = await req.json()

    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { id: true, email: true, prenom: true, motDePasse: true },
    })
    if (!user) return NextResponse.json({ error: t.api.userNotFound }, { status: 404 })

    // Seuls les comptes sans mot de passe (Google) utilisent ce mécanisme
    if (user.motDePasse) {
      return NextResponse.json(
        { error: t.msg.hasPasswordUseIt },
        { status: 400 }
      )
    }

    if (action === 'send') {
      if (!user.email) {
        return NextResponse.json({ error: t.msg.noEmailOnAccount }, { status: 400 })
      }

      const code      = crypto.randomInt(100000, 999999).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      // Supprimer tout OTP précédent
      await prisma.otpToken.deleteMany({ where: { identifiant: profileOtpKey(user.id) } })

      // Stocker le nouveau
      await prisma.otpToken.create({
        data: { identifiant: profileOtpKey(user.id), token: code, data: '{}', expiresAt },
      })

      await sendIdentityOtpEmail(user.email, code, user.prenom ?? '', locale)

      return NextResponse.json({ message: t.msg.codeSentToEmail })
    }

    return NextResponse.json({ error: t.msg.invalidAction }, { status: 400 })
  } catch (err) {
    console.error('Erreur OTP profil:', err)
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}