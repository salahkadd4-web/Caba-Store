import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, sanitize, isValidEmail, isValidPhone } from '@/lib/security'

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 60 * 1000 })
  if (limited) return limited

  try {
    const body = await req.json()

    // ✅ Même normalisation que l'inscription et authorize()
    const identifiant = sanitize(body.identifiant ?? '')
      .trim()
      .replace(/\s/g, '')
      .toLowerCase()

    if (!identifiant) {
      return NextResponse.json({ exists: false })
    }

    // Validation format avant toute requête DB
    const isEmail = identifiant.includes('@')
    if (isEmail && !isValidEmail(identifiant)) {
      return NextResponse.json({ exists: false, invalid: true })
    }
    if (!isEmail && !isValidPhone(identifiant)) {
      return NextResponse.json({ exists: false, invalid: true })
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email:     identifiant },
          { telephone: identifiant },
        ],
      },
      select: {
        id:        true,
        motDePasse: true,   // ✅ pour détecter les comptes Google
      },
    })

    return NextResponse.json({
      exists:          !!user,
      // ✅ true si le compte existe mais n'a pas de mot de passe → compte Google
      isGoogleAccount: user ? !user.motDePasse : false,
    })
  } catch {
    return NextResponse.json({ exists: false })
  }
}