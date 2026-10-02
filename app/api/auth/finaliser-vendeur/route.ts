// app/api/auth/finaliser-vendeur/route.ts
//
// Finalise l'inscription Google d'un vendeur.
//
// Deux modes selon le paramètre `skipPhone` :
//
// ── Mode NORMAL (skipPhone absent/false) ─────────────────────────────────────
//   Étape 1 → collecte téléphone + nomBoutique → envoie OTP
//   Étape 2 → vérifie OTP → met à jour le rôle → crée le VendeurProfile
//
// ── Mode SKIP_PHONE (skipPhone: true) ────────────────────────────────────────
//   Le téléphone a déjà été vérifié dans /api/auth/google-finaliser.
//   Étape 1 → collecte nomBoutique uniquement → crée le VendeurProfile directement
//   (pas d'OTP car le téléphone est déjà présent et vérifié sur le compte)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { sendOTP, verifyOTP, formatPhone, validatePhone } from '@/lib/twilio'
import { sanitize } from '@/lib/security'
import { getI18n } from '@/lib/i18n/server'
import { validateWilayaCommune, type WilayaCommuneResult } from '@/lib/algeria/server'

/** Wilaya + commune de la boutique obligatoires. Retourne le message d'erreur ou les valeurs. */
function lieuBoutique(body: { wilaya?: unknown; commune?: unknown }): WilayaCommuneResult & { complete: boolean } {
  const res = validateWilayaCommune(body.wilaya, body.commune)
  return { ...res, complete: res.ok && !!res.wilaya && !!res.commune }
}

const UNIVERSAL_CODE  = '000000'
const TWILIO_TEST_NUM = process.env.TWILIO_TEST_NUMBER

function isTwilioTestNumber(telephone: string): boolean {
  if (!TWILIO_TEST_NUM) return false
  const clean      = telephone.replace(/\s/g, '')
  const cleanTest  = TWILIO_TEST_NUM.replace(/\s/g, '')
  return (
    clean === cleanTest ||
    formatPhone(clean) === formatPhone(cleanTest)
  )
}

export async function POST(req: NextRequest) {
  const { t, locale } = await getI18n()
  const m = t.auth.api
  const erreurLieu = (l: ReturnType<typeof lieuBoutique>) =>
    !l.ok ? (l.field === 'wilaya' ? t.address.invalidWilaya : t.address.invalidCommune) : m.sellerLocationRequired
  try {
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json({ error: t.api.unauthenticated }, { status: 401 })
    }

    if (token.role === 'VENDEUR' || token.role === 'ADMIN') {
      return NextResponse.json({ error: m.alreadyActivated }, { status: 400 })
    }

    const body      = await req.json()
    const etape     = Number(body.etape)
    const skipPhone = body.skipPhone === true
    const userId    = token.id as string

    // ════════════════════════════════════════════════════════════════════════
    // MODE SKIP_PHONE : téléphone déjà vérifié dans google-finaliser
    // Étape 1 = création directe du profil vendeur (pas d'OTP)
    // ════════════════════════════════════════════════════════════════════════
    if (etape === 1 && skipPhone) {
      const nomBoutique = body.nomBoutique ? sanitize(body.nomBoutique) : null

      if (!nomBoutique || nomBoutique.length < 2) {
        return NextResponse.json(
          { error: m.shopNameRequired },
          { status: 400 }
        )
      }
      if (nomBoutique.length > 100) {
        return NextResponse.json(
          { error: m.shopNameTooLong },
          { status: 400 }
        )
      }
      const lieu = lieuBoutique(body)
      if (!lieu.ok || !lieu.complete) {
        return NextResponse.json({ error: erreurLieu(lieu) }, { status: 400 })
      }

      // Vérifier que l'utilisateur a bien un téléphone défini (garanti par google-finaliser)
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        return NextResponse.json({ error: t.api.userNotFound }, { status: 404 })
      }
      if (!user.telephone) {
        return NextResponse.json(
          { error: m.phoneMissing },
          { status: 400 }
        )
      }

      // Créer le profil vendeur directement (téléphone déjà vérifié)
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data:  { role: 'VENDEUR', wilaya: lieu.wilaya, commune: lieu.commune },
        })

        const existing = await tx.vendeurProfile.findUnique({ where: { userId } })
        if (!existing) {
          await tx.vendeurProfile.create({
            data: {
              userId,
              statut:            'EN_ATTENTE',
              nomBoutique,
              prioriteAffichage: 3,
            },
          })
        }
      })

      return NextResponse.json({
        message:   m.sellerCreated,
        role:      'VENDEUR',
        skipPhone: true,
      }, { status: 201 })
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODE NORMAL : étape 1 → envoi OTP ──────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    if (etape === 1) {
      const telephone   = body.telephone   ? sanitize(body.telephone).replace(/\s/g, '') : null
      const nomBoutique = body.nomBoutique ? sanitize(body.nomBoutique) : null

      if (!telephone) {
        return NextResponse.json({ error: m.phoneRequired }, { status: 400 })
      }
      if (!validatePhone(telephone)) {
        return NextResponse.json({ error: m.invalidPhoneFormat }, { status: 400 })
      }
      if (!nomBoutique || nomBoutique.length < 2) {
        return NextResponse.json({ error: m.shopNameRequired }, { status: 400 })
      }
      if (nomBoutique.length > 100) {
        return NextResponse.json({ error: m.shopNameTooLong }, { status: 400 })
      }
      const lieu = lieuBoutique(body)
      if (!lieu.ok || !lieu.complete) {
        return NextResponse.json({ error: erreurLieu(lieu) }, { status: 400 })
      }

      const existingPhone = await prisma.user.findFirst({
        where: { telephone, NOT: { id: userId } },
      })
      if (existingPhone) {
        return NextResponse.json({ error: m.phoneUsedOther }, { status: 400 })
      }

      const useRealSMS = isTwilioTestNumber(telephone)
      const tokenValue = useRealSMS ? 'TWILIO_VERIFY' : UNIVERSAL_CODE

      await prisma.otpToken.deleteMany({ where: { identifiant: `vendeur_google_${userId}` } })
      await prisma.otpToken.create({
        data: {
          identifiant: `vendeur_google_${userId}`,
          token:       tokenValue,
          expiresAt:   new Date(Date.now() + 15 * 60 * 1000),
          data:        JSON.stringify({ telephone, nomBoutique, userId, wilaya: lieu.wilaya, commune: lieu.commune }),
        },
      })

      if (useRealSMS) {
        await sendOTP(telephone, locale)
        return NextResponse.json({ message: m.codeSentSms })
      }

      return NextResponse.json({
        message:  m.testCode,
        testMode: true,
      })
    }

    // ── Mode normal : étape 2 → vérification OTP ────────────────────────────
    if (etape === 2) {
      const code = String(body.code || '').trim()

      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: m.invalidCode6 }, { status: 400 })
      }

      const otpToken = await prisma.otpToken.findFirst({
        where: {
          identifiant: `vendeur_google_${userId}`,
          expiresAt:   { gt: new Date() },
        },
      })

      if (!otpToken) {
        return NextResponse.json({ error: m.sessionExpired }, { status: 400 })
      }

      const savedData = JSON.parse(otpToken.data) as {
        telephone:   string
        nomBoutique: string
        userId:      string
        wilaya?:     string | null
        commune?:    string | null
      }

      if (otpToken.token === 'TWILIO_VERIFY') {
        const isValid = await verifyOTP(savedData.telephone, code)
        if (!isValid) {
          return NextResponse.json({ error: m.codeInvalidOrExpired }, { status: 400 })
        }
      } else {
        if (code !== UNIVERSAL_CODE) {
          return NextResponse.json({ error: m.invalidCode }, { status: 400 })
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            role:      'VENDEUR',
            telephone: savedData.telephone,
            wilaya:    savedData.wilaya  ?? null,
            commune:   savedData.commune ?? null,
          },
        })

        const existing = await tx.vendeurProfile.findUnique({ where: { userId } })
        if (!existing) {
          await tx.vendeurProfile.create({
            data: {
              userId,
              statut:            'EN_ATTENTE',
              nomBoutique:       savedData.nomBoutique,
              prioriteAffichage: 3,
            },
          })
        }
      })

      await prisma.otpToken.delete({ where: { id: otpToken.id } })

      return NextResponse.json({
        message: m.sellerCreated,
        role:    'VENDEUR',
      }, { status: 201 })
    }

    return NextResponse.json({ error: m.invalidRequest }, { status: 400 })

  } catch (err) {
    console.error('Erreur finaliser-vendeur:', err)
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}