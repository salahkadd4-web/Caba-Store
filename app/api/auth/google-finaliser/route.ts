// app/api/auth/google-finaliser/route.ts
//
// Finalise la création d'un compte via Google pour les NOUVEAUX utilisateurs.
//
// Step 1 : { tempToken, telephone, role } → valide le tel → envoie OTP
// Step 2 : { tempToken, code }            → vérifie OTP  → crée le User → renvoie userId
//
// Le tempToken est créé en amont (auth.ts pour web, google-native pour mobile)
// et stocké dans otpToken avec identifiant = `google_oauth_${tempToken}`.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOTP, verifyOTP, validatePhone } from '@/lib/twilio'
import { sanitize } from '@/lib/security'
import { getI18n } from '@/lib/i18n/server'

const UNIVERSAL_CODE  = '000000'
const TWILIO_TEST_NUM = process.env.TWILIO_TEST_NUMBER

function isTwilioTestNumber(telephone: string): boolean {
  if (!TWILIO_TEST_NUM) return false
  const clean     = telephone.replace(/\s/g, '')
  const cleanTest = TWILIO_TEST_NUM.replace(/\s/g, '')
  return clean === cleanTest || `+213${clean.slice(1)}` === `+213${cleanTest.slice(1)}`
}

export async function POST(req: NextRequest) {
  const { t, locale } = await getI18n()
  try {
    const body      = await req.json()
    const etape     = Number(body.etape)
    const tempToken = String(body.tempToken || '').trim()

    if (!tempToken || !/^[a-f0-9]{64}$/.test(tempToken)) {
      return NextResponse.json({ error: t.auth.api.invalidToken }, { status: 400 })
    }

    const identifiant = `google_oauth_${tempToken}`

    // ── Étape 1 : validation téléphone + envoi OTP ───────────────────────────
    if (etape === 1) {
      const telephone = body.telephone
        ? sanitize(body.telephone).replace(/\s/g, '')
        : null
      const role = body.role === 'VENDEUR' ? 'VENDEUR' : 'CLIENT'

      if (!telephone || !validatePhone(telephone)) {
        return NextResponse.json(
          { error: t.auth.api.invalidPhoneFormat },
          { status: 400 }
        )
      }

      // Récupérer le token temporaire (données Google)
      const record = await prisma.otpToken.findFirst({
        where: { identifiant, expiresAt: { gt: new Date() } },
      })
      if (!record) {
        return NextResponse.json(
          { error: t.auth.api.googleSessionExpired },
          { status: 400 }
        )
      }

      const googleData = JSON.parse(record.data) as { email: string; name: string }

      // Vérifier que l'email n'a pas été créé entre-temps
      const existing = await prisma.user.findFirst({ where: { email: googleData.email } })
      if (existing) {
        await prisma.otpToken.deleteMany({ where: { identifiant } })
        return NextResponse.json(
          { error: t.auth.api.accountExists },
          { status: 409 }
        )
      }

      // Vérifier que le téléphone n'est pas déjà utilisé
      const phoneExists = await prisma.user.findFirst({ where: { telephone } })
      if (phoneExists) {
        return NextResponse.json(
          { error: t.auth.api.phoneUsedOther },
          { status: 400 }
        )
      }

      const useRealSMS = isTwilioTestNumber(telephone)
      const otpCode    = useRealSMS ? 'TWILIO_VERIFY' : UNIVERSAL_CODE

      // Mettre à jour le token avec téléphone + rôle + code OTP
      await prisma.otpToken.update({
        where: { id: record.id },
        data: {
          token:     otpCode,
          data:      JSON.stringify({ ...googleData, telephone, role }),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      })

      if (useRealSMS) {
        await sendOTP(telephone, locale)
        return NextResponse.json({ message: t.auth.api.codeSentSms })
      }

      return NextResponse.json({
        message:  t.auth.api.testModeCode,
        testMode: true,
      })
    }

    // ── Étape 2 : vérification OTP + création du compte ─────────────────────
    if (etape === 2) {
      const code = String(body.code || '').trim()
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: t.auth.api.invalidCode6 }, { status: 400 })
      }

      const record = await prisma.otpToken.findFirst({
        where: { identifiant, expiresAt: { gt: new Date() } },
      })
      if (!record || !record.token) {
        return NextResponse.json(
          { error: t.auth.api.sessionExpiredStep1 },
          { status: 400 }
        )
      }

      const data = JSON.parse(record.data) as {
        email:     string
        name:      string
        telephone: string
        role:      'CLIENT' | 'VENDEUR'
      }

      // Vérifier OTP
      if (record.token === 'TWILIO_VERIFY') {
        const valid = await verifyOTP(data.telephone, code)
        if (!valid) {
          return NextResponse.json({ error: t.auth.api.codeInvalidOrExpired }, { status: 400 })
        }
      } else {
        if (code !== UNIVERSAL_CODE) {
          return NextResponse.json({ error: t.auth.api.invalidCode }, { status: 400 })
        }
      }

      // Double-check : l'email/tel n'existe toujours pas
      const emailExists = await prisma.user.findFirst({ where: { email: data.email } })
      if (emailExists) {
        await prisma.otpToken.deleteMany({ where: { identifiant } })
        return NextResponse.json(
          { error: t.auth.api.accountExists },
          { status: 409 }
        )
      }

      // Créer l'utilisateur (toujours CLIENT, finaliser-vendeur upgrades si besoin)
      const parts = data.name.split(' ')
      const user  = await prisma.user.create({
        data: {
          email:      data.email,
          prenom:     parts[0] || '',
          nom:        parts.slice(1).join(' ') || '',
          role:       'CLIENT',          // toujours CLIENT à la création
          telephone:  data.telephone,   // déjà vérifié
          motDePasse: null,
        },
      })

      await prisma.otpToken.delete({ where: { id: record.id } })

      return NextResponse.json({
        ok:     true,
        userId: user.id,
        role:   data.role,   // rôle souhaité (CLIENT ou VENDEUR) — la page s'en charge
      }, { status: 201 })
    }

    return NextResponse.json({ error: t.api.invalidRequest }, { status: 400 })

  } catch (err) {
    console.error('[google-finaliser]', err)
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}