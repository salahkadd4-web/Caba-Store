// app/api/auth/dev-login/route.ts
//
// Connexion rapide DEV. Le client envoie uniquement un rôle ; les identifiants
// sont résolus côté serveur depuis les variables d'env. Aucun mot de passe
// n'est exposé au bundle JS. Désactivé en production (404).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signIn } from '@/auth'

const DEV_EMAILS = {
  admin:   'cabastoredz31@gmail.com',
  vendeur: 'vendeur.test@caba.dz',
  client:  'client.test@caba.dz',
} as const

type DevRole = keyof typeof DEV_EMAILS

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const { role } = await req.json()
    if (role !== 'admin' && role !== 'vendeur' && role !== 'client') {
      return NextResponse.json({ ok: false, error: 'Rôle invalide.' }, { status: 400 })
    }

    const email = DEV_EMAILS[role as DevRole]
    const user = await prisma.user.findFirst({ where: { email } })
    if (!user) {
      return NextResponse.json({ ok: false, error: `Compte DEV ${role} introuvable.` }, { status: 404 })
    }

    // Connexion server-side : NextAuth pose le cookie de session sur la réponse.
    await signIn('credentials-google', {
      userId:   user.id,
      redirect: false,
    })

    return NextResponse.json({ ok: true, role: user.role })
  } catch (err) {
    console.error('[dev-login] Erreur:', err)
    return NextResponse.json({ ok: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
