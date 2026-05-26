import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendOTP, verifyOTP } from '@/lib/twilio'
import { sendConfirmationEmail } from '@/lib/mail'
import crypto from 'crypto'
import {
  rateLimit, rateLimits,
  sanitize, isValidEmail, isValidPhone, isStrongPassword,
} from '@/lib/security'

const IS_DEV = process.env.NODE_ENV === 'development'
const DEV_OTP_CODE = '000000'

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, rateLimits.auth)
  if (limited) return limited

  try {
    const body = await req.json()
    const etape = Number(body.etape)   // le frontend envoie '1' / '2' (string) → on convertit en nombre
    const { code } = body

    // Sanitisation
    const nom         = sanitize(body.nom)
    const prenom      = sanitize(body.prenom)
    const email       = body.email     ? sanitize(body.email).toLowerCase()       : null
    const telephone   = body.telephone ? sanitize(body.telephone).replace(/\s/g, '') : null
    const motDePasse  = typeof body.motDePasse === 'string' ? body.motDePasse : ''
    // Rôle choisi lors de l'inscription : CLIENT (défaut) ou VENDEUR
    const roleChoisi  = body.role === 'VENDEUR' ? 'VENDEUR' : 'CLIENT'
    // Nom de boutique — obligatoire pour les vendeurs
    const nomBoutique = body.nomBoutique ? sanitize(body.nomBoutique) : null

    // ── Étape 1 : Envoi du code ──────────────────────────
    if (etape === 1 || !etape) {
      if (!nom || !prenom || !motDePasse) {
        return NextResponse.json(
          { error: 'Nom, prénom et mot de passe sont obligatoires' },
          { status: 400 }
        )
      }

      if (nom.length > 50 || prenom.length > 50) {
        return NextResponse.json({ error: 'Nom ou prénom trop long' }, { status: 400 })
      }

      if (!email && !telephone) {
        return NextResponse.json(
          { error: 'Email ou téléphone est obligatoire' },
          { status: 400 }
        )
      }

      if (!isStrongPassword(motDePasse)) {
        return NextResponse.json({
          error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial',
        }, { status: 400 })
      }

      // Validation spécifique vendeur
      if (roleChoisi === 'VENDEUR') {
        if (!nomBoutique || nomBoutique.length < 2) {
          return NextResponse.json(
            { error: 'Le nom de la boutique est obligatoire pour les vendeurs (min. 2 caractères)' },
            { status: 400 }
          )
        }
        if (nomBoutique.length > 100) {
          return NextResponse.json({ error: 'Nom de boutique trop long (100 caractères max)' }, { status: 400 })
        }
      }

      // ── Inscription par email ──
      if (email) {
        if (!isValidEmail(email)) {
          return NextResponse.json({ error: 'Format email invalide' }, { status: 400 })
        }
        const existingEmail = await prisma.user.findUnique({ where: { email } })
        if (existingEmail) {
          return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
        }

        // En dev : code fixe 000000, sinon code aléatoire
        const otpCode  = IS_DEV ? DEV_OTP_CODE : crypto.randomInt(100000, 999999).toString()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

        await prisma.otpToken.deleteMany({ where: { identifiant: email } })
        await prisma.otpToken.create({
          data: {
            identifiant: email,
            token: otpCode,
            expiresAt,
            data: JSON.stringify({ nom, prenom, email, motDePasse, role: roleChoisi, nomBoutique }),
          },
        })

        // En dev : pas d'envoi d'email réel
        if (!IS_DEV) {
          await sendConfirmationEmail(email, otpCode, nom)
        }

        return NextResponse.json({
          message: IS_DEV
            ? '[DEV] Vérification désactivée — utilisez le code : 000000'
            : 'Code envoyé par email',
          requireOTP: true,
          ...(IS_DEV && { devCode: DEV_OTP_CODE }),
        })
      }

      // ── Inscription par téléphone ──
      if (telephone) {
        if (!isValidPhone(telephone)) {
          return NextResponse.json({ error: 'Numéro invalide. Format: 05XX XX XX XX' }, { status: 400 })
        }
        const existingPhone = await prisma.user.findUnique({ where: { telephone } })
        if (existingPhone) {
          return NextResponse.json({ error: 'Ce numéro est déjà utilisé' }, { status: 400 })
        }

        await prisma.otpToken.deleteMany({ where: { identifiant: telephone } })
        await prisma.otpToken.create({
          data: {
            identifiant: telephone,
            // En dev : code fixe 000000, sinon marqueur Twilio Verify
            token: IS_DEV ? DEV_OTP_CODE : 'TWILIO_VERIFY',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            data: JSON.stringify({ nom, prenom, telephone, motDePasse, role: roleChoisi, nomBoutique }),
          },
        })

        // En dev : pas d'envoi SMS réel
        if (!IS_DEV) {
          await sendOTP(telephone)
        }

        return NextResponse.json({
          message: IS_DEV
            ? '[DEV] Vérification désactivée — utilisez le code : 000000'
            : 'Code envoyé par SMS',
          requireOTP: true,
          ...(IS_DEV && { devCode: DEV_OTP_CODE }),
        })
      }
    }

    // ── Étape 2 : Vérification OTP + création compte ────
    if (etape === 2) {
      const otpLimited = await rateLimit(req, rateLimits.otp)
      if (otpLimited) return otpLimited

      const identifiant = email || telephone
      if (!identifiant || !code) {
        return NextResponse.json({ error: 'Code requis' }, { status: 400 })
      }

      if (!/^\d{6}$/.test(String(code))) {
        return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
      }

      const otpToken = await prisma.otpToken.findFirst({
        where: { identifiant, expiresAt: { gt: new Date() } },
      })

      if (!otpToken) {
        return NextResponse.json({ error: 'Session expirée, recommencez' }, { status: 400 })
      }

      // ── Vérification OTP (bypass en dev avec le code 000000) ──
      const isDevBypass = IS_DEV && String(code) === DEV_OTP_CODE

      if (!isDevBypass) {
        if (email) {
          const valid = crypto.timingSafeEqual(
            Buffer.from(otpToken.token),
            Buffer.from(String(code))
          )
          if (!valid) {
            return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
          }
        }

        if (telephone) {
          const isValid = await verifyOTP(telephone, String(code))
          if (!isValid) {
            return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
          }
        }
      }

      const savedData = JSON.parse(otpToken.data)

      if (!isStrongPassword(savedData.motDePasse)) {
        return NextResponse.json({ error: 'Mot de passe invalide' }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(savedData.motDePasse, 12)

      // Création du compte
      const newUser = await prisma.user.create({
        data: {
          nom:        savedData.nom,
          prenom:     savedData.prenom,
          email:      savedData.email     || null,
          telephone:  savedData.telephone || null,
          motDePasse: hashedPassword,
          role:       savedData.role || 'CLIENT',
        },
      })

      // Si vendeur → créer le profil vendeur (bloqué par défaut : EN_ATTENTE)
      if (savedData.role === 'VENDEUR') {
        await prisma.vendeurProfile.create({
          data: {
            userId:      newUser.id,
            statut:      'EN_ATTENTE',
            nomBoutique: savedData.nomBoutique || null,
          },
        })
      }

      await prisma.otpToken.delete({ where: { id: otpToken.id } })

      const message = savedData.role === 'VENDEUR'
        ? 'Compte vendeur créé. Il sera activé après validation par notre équipe.'
        : 'Compte créé avec succès'

      return NextResponse.json({ message, role: savedData.role }, { status: 201 })
    }

    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  } catch (error) {
    console.error('Erreur inscription:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}