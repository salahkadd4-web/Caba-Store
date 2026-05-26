// app/api/profil/email/check/route.ts
//
// Route AJAX appelée par la page profil pour vérifier en temps réel
// si un email est déjà utilisé, avant de soumettre le formulaire.
// Requiert une session valide (un utilisateur non connecté ne peut
// pas énumérer les emails du système).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { rateLimit, sanitize, isValidEmail } from '@/lib/security'

export async function POST(req: NextRequest) {
  // Rate limiting : 20 vérifications / min par IP
  // (debounce côté client à 600ms, donc ~1 appel / frappe rapide)
  const limited = await rateLimit(req, { maxRequests: 20, windowMs: 60 * 1000 })
  if (limited) return limited

  try {
    // Authentification requise — protège contre l'énumération anonyme
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body  = await req.json()
    const email = sanitize(body.email || '').toLowerCase()

    // Validation format avant toute requête DB
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ exists: false })
    }

    const existing = await prisma.user.findFirst({
      where:  { email },
      select: { id: true },
    })

    return NextResponse.json({ exists: !!existing })

  } catch {
    return NextResponse.json({ exists: false })
  }
}
