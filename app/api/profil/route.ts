import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import bcrypt from 'bcryptjs'
import { verifyAndConsumeProfileOtp } from '@/lib/profileOtp'
import { getI18n } from '@/lib/i18n/server'
import { validateWilayaCommune } from '@/lib/algeria/server'

export async function GET() {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: {
        nom: true, prenom: true, email: true,
        telephone: true, age: true, genre: true,
        wilaya: true, commune: true, adresse: true,
        motDePasse: true, // nécessaire pour hasPassword
      },
    })

    if (!user) return NextResponse.json({ error: t.api.notFound }, { status: 404 })

    const { motDePasse, ...rest } = user // ne pas exposer le hash
    return NextResponse.json({ ...rest, hasPassword: !!motDePasse })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const { nom, prenom, telephone, age, genre, wilaya, commune, adresse, motDePasse, otp } = await req.json()

    if (nom    !== undefined && !nom)    return NextResponse.json({ error: t.api.lastNameRequired },  { status: 400 })
    if (prenom !== undefined && !prenom) return NextResponse.json({ error: t.api.firstNameRequired }, { status: 400 })

    // Wilaya / commune : normalisées (code de wilaya) et validées contre les fichiers JSON
    let lieu: { wilaya: string | null; commune: string | null } | null = null
    if (wilaya !== undefined || commune !== undefined) {
      const res = validateWilayaCommune(wilaya, commune)
      if (!res.ok) {
        return NextResponse.json(
          { error: res.field === 'wilaya' ? t.address.invalidWilaya : t.address.invalidCommune },
          { status: 400 },
        )
      }
      lieu = { wilaya: res.wilaya, commune: res.commune }
    }

    const modifieInfosSensibles =
      nom     !== undefined ||
      prenom  !== undefined ||
      genre   !== undefined ||
      age     !== undefined ||
      lieu    !== null      ||
      adresse !== undefined

    if (modifieInfosSensibles) {
      const user = await prisma.user.findUnique({ where: { id: token.id as string } })
      if (!user) return NextResponse.json({ error: t.api.userNotFound }, { status: 404 })

      if (user.motDePasse) {
        // ── Compte avec mot de passe : vérification classique ──────────────
        if (!motDePasse) {
          return NextResponse.json(
            { error: t.api.passwordRequiredToConfirm },
            { status: 400 }
          )
        }
        const valid = await bcrypt.compare(motDePasse, user.motDePasse)
        if (!valid) return NextResponse.json({ error: t.api.wrongPassword }, { status: 400 })
      } else {
        // ── Compte Google (sans mot de passe) : vérification par OTP ───────
        if (!otp) {
          return NextResponse.json(
            { error: t.api.confirmationCodeRequired },
            { status: 400 }
          )
        }
        const otpValid = await verifyAndConsumeProfileOtp(user.id, otp)
        if (!otpValid) {
          return NextResponse.json(
            { error: t.api.codeInvalidOrExpired },
            { status: 400 }
          )
        }
      }
    }

    if (telephone) {
      const existing = await prisma.user.findFirst({
        where: { telephone, NOT: { id: token.id as string } },
      })
      if (existing) return NextResponse.json({ error: t.api.phoneAlreadyUsed }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: token.id as string },
      data: {
        ...(nom       !== undefined && { nom }),
        ...(prenom    !== undefined && { prenom }),
        ...(telephone !== undefined && { telephone: telephone || null }),
        ...(age       !== undefined && { age: age || null }),
        ...(genre     !== undefined && { genre: genre || null }),
        ...(lieu      !== null      && lieu),
        ...(adresse   !== undefined && { adresse: adresse || null }),
      },
      // Ne jamais renvoyer le hash du mot de passe au client
      select: {
        id: true, nom: true, prenom: true, email: true, telephone: true,
        age: true, genre: true, wilaya: true, commune: true, adresse: true,
      },
    })

    return NextResponse.json({ message: t.api.profileUpdated, user: updated })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
