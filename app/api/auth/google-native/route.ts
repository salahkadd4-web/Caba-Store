// app/api/auth/google-native/route.ts
//
// Reçoit le idToken émis par le plugin natif @capgo/capacitor-social-login,
// le vérifie via Google, puis :
//   • Si le compte existe  → { ok: true, exists: true,  userId }
//   • Si le compte n'existe pas → crée un token temporaire et
//                                  { ok: true, exists: false, tempToken }
//     Le client redirige alors vers /inscription/finaliser-google?token=...

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { getI18n } from '@/lib/i18n/server'

export async function POST(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const { idToken } = await req.json()

    if (!idToken) {
      return NextResponse.json({ ok: false, error: t.auth.api.tokenMissing }, { status: 400 })
    }

    // ── 1. Vérifier le idToken auprès de Google ──────────────────────────────
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    )

    if (!googleRes.ok) {
      return NextResponse.json({ ok: false, error: t.auth.api.googleTokenInvalid }, { status: 401 })
    }

    const payload = await googleRes.json()

    const validAudiences = [
      process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      process.env.GOOGLE_CLIENT_ID,
    ].filter(Boolean)

    if (!validAudiences.includes(payload.aud)) {
      return NextResponse.json({ ok: false, error: t.auth.api.audienceInvalid }, { status: 401 })
    }

    const email: string = payload.email
    const name: string  = payload.name ?? ''

    if (!email) {
      return NextResponse.json({ ok: false, error: t.auth.api.emailMissingInToken }, { status: 400 })
    }

    // ── 2. Vérifier si le compte existe déjà ────────────────────────────────
    const user = await prisma.user.findFirst({
      where: { email },
      include: { vendeurProfile: true },
    })

    if (user) {
      // ✅ Compte existant → retourner l'userId pour signIn direct
      return NextResponse.json({ ok: true, exists: true, userId: user.id })
    }

    // ── 3. Nouveau compte → créer un token temporaire ───────────────────────
    // Le client sera redirigé vers /inscription/finaliser-google?token=...
    // où l'utilisateur saisit son téléphone et choisit son rôle.
    const tempToken = crypto.randomBytes(32).toString('hex')

    // Nettoyer d'éventuels anciens tokens pour cet email
    await prisma.otpToken.deleteMany({
      where: { data: { contains: email } },
    })

    await prisma.otpToken.create({
      data: {
        identifiant: `google_oauth_${tempToken}`,
        token:       '',   // pas encore d'OTP
        expiresAt:   new Date(Date.now() + 30 * 60 * 1000),
        data:        JSON.stringify({ email, name }),
      },
    })

    return NextResponse.json({ ok: true, exists: false, tempToken })

  } catch (err) {
    console.error('[google-native] Erreur:', err)
    return NextResponse.json({ ok: false, error: t.api.serverError }, { status: 500 })
  }
}