import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import bcrypt from 'bcryptjs'
import { sendConfirmationEmail } from '@/lib/mail'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { etape } = body

    const user = await prisma.user.findUnique({ where: { id: token.id as string } })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    // ── Étape 1 : Vérifier l'identité puis envoyer codes aux deux emails ──────
    if (etape === 1) {
      const { motDePasse, nouvelEmail } = body

      if (!nouvelEmail) {
        return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
      }

      if (user.motDePasse) {
        // Compte avec mot de passe : vérification classique
        if (!motDePasse) {
          return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 })
        }
        const valid = await bcrypt.compare(motDePasse, user.motDePasse)
        if (!valid) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 400 })
      }
      // Compte Google (sans mot de passe) : pas de vérification par mot de passe.
      // La confirmation double (code email actuel + code nouvel email) suffit.

      // Vérifier que le nouvel email n'est pas déjà utilisé
      const existing = await prisma.user.findFirst({ where: { email: nouvelEmail } })
      if (existing) return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })

      // Générer deux codes
      const codeAncien  = crypto.randomInt(100000, 999999).toString()
      const codeNouveau = crypto.randomInt(100000, 999999).toString()
      const expiresAt   = new Date(Date.now() + 15 * 60 * 1000)

      await prisma.otpToken.deleteMany({ where: { identifiant: `email_change_${user.id}` } })

      await prisma.otpToken.create({
        data: {
          identifiant: `email_change_${user.id}`,
          token:       `${codeAncien}:${codeNouveau}`,
          data:        JSON.stringify({ nouvelEmail }),
          expiresAt,
        },
      })

      if (user.email) {
        await sendConfirmationEmail(user.email, codeAncien, user.prenom ?? '')
      }
      await sendConfirmationEmail(nouvelEmail, codeNouveau, user.prenom ?? '')

      return NextResponse.json({ message: 'Codes envoyés' })
    }

    // ── Étape 2 : Vérifier le code de l'ancien email ──────────────────────────
    if (etape === 2) {
      const { nouvelEmail, codeAncien } = body

      const otpToken = await prisma.otpToken.findFirst({
        where: {
          identifiant: `email_change_${user.id}`,
          expiresAt:   { gt: new Date() },
        },
      })

      if (!otpToken) return NextResponse.json({ error: 'Session expirée, recommencez' }, { status: 400 })

      const [storedAncien] = otpToken.token.split(':')
      const savedData = JSON.parse(otpToken.data)

      if (savedData.nouvelEmail !== nouvelEmail) {
        return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
      }
      if (codeAncien !== storedAncien) {
        return NextResponse.json({ error: "Code de l'ancien email incorrect" }, { status: 400 })
      }

      return NextResponse.json({ message: 'Code vérifié, continuez' })
    }

    // ── Étape 3 : Vérifier le code du nouvel email et mettre à jour ───────────
    if (etape === 3) {
      const { nouvelEmail, codeNouveau } = body

      const otpToken = await prisma.otpToken.findFirst({
        where: {
          identifiant: `email_change_${user.id}`,
          expiresAt:   { gt: new Date() },
        },
      })

      if (!otpToken) return NextResponse.json({ error: 'Session expirée, recommencez' }, { status: 400 })

      const [, storedNouveau] = otpToken.token.split(':')
      const savedData = JSON.parse(otpToken.data)

      if (savedData.nouvelEmail !== nouvelEmail) {
        return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
      }
      if (codeNouveau !== storedNouveau) {
        return NextResponse.json({ error: 'Code du nouvel email incorrect' }, { status: 400 })
      }

      await prisma.user.update({
        where: { id: token.id as string },
        data:  { email: nouvelEmail },
      })

      await prisma.otpToken.delete({ where: { id: otpToken.id } })

      return NextResponse.json({ message: 'Email modifié avec succès' })
    }

    return NextResponse.json({ error: 'Étape invalide' }, { status: 400 })
  } catch (error) {
    console.error('Erreur changement email:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}