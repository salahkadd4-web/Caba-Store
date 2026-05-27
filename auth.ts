import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { prisma } from './lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { authConfig } from './auth.config'

const isProd   = process.env.NODE_ENV === 'production'
const PROD_URL = process.env.NEXTAUTH_URL || 'https://caba-store.vercel.app'

// ── Normalisation de l'identifiant (cohérent avec l'inscription) ──────────────
// L'inscription fait : email.toLowerCase() + telephone.replace(/\s/g, '')
// → On applique les deux ici pour matcher exactement ce qui est en DB.
function normalizeIdentifiant(raw: string): string {
  return raw.trim().replace(/\s/g, '').toLowerCase()
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  providers: [

    // ── 1. Email / Téléphone + mot de passe ────────────────────────────────
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        identifiant: { label: 'Email ou téléphone', type: 'text' },
        motDePasse:  { label: 'Mot de passe',        type: 'password' },
      },
      async authorize(credentials) {
        // ── Validation des champs ──
        if (!credentials?.identifiant || !credentials?.motDePasse) return null

        const identifiant = normalizeIdentifiant(credentials.identifiant as string)
        const motDePasse  = credentials.motDePasse as string

        if (!identifiant) return null

        try {
          // ── Recherche de l'utilisateur en DB ──
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email:     identifiant },
                { telephone: identifiant },
              ],
            },
            include: { vendeurProfile: true },
          })

          if (!user) {
            console.log('[authorize:credentials] Utilisateur introuvable :', identifiant)
            return null
          }

          // ── Compte Google sans mot de passe ──
          // La page détecte ce cas via /api/auth/verifier-identifiant
          if (!user.motDePasse) {
            console.log('[authorize:credentials] Compte Google (pas de motDePasse) :', identifiant)
            return null
          }

          // ── Vérification du mot de passe ──
          const passwordMatch = await bcrypt.compare(motDePasse, user.motDePasse)
          if (!passwordMatch) {
            console.log('[authorize:credentials] Mot de passe incorrect pour :', identifiant)
            return null
          }

          // ── Succès ──
          return {
            id:            user.id,
            name:          `${user.prenom} ${user.nom}`,
            email:         user.email,
            role:          user.role,
            telephone:     user.telephone     ?? null,
            vendeurStatut: user.vendeurProfile?.statut ?? null,
          }

        } catch (error) {
          // Sans ce catch, toute erreur Prisma/bcrypt devient silencieusement
          // "CredentialsSignin" et affiche "Identifiant ou mot de passe incorrect."
          // → Le log ici permet de voir le vrai problème dans les logs serveur.
          console.error('[authorize:credentials] Erreur inattendue :', error)
          return null
        }
      },
    }),

    // ── 2. Google natif (mobile Capacitor) ──────────────────────────────────
    Credentials({
      id: 'credentials-google',
      name: 'Google Native',
      credentials: {
        userId: { label: 'User ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.userId) return null

        try {
          const user = await prisma.user.findUnique({
            where: { id: credentials.userId as string },
            include: { vendeurProfile: true },
          })

          if (!user) {
            console.log('[authorize:google-native] Utilisateur introuvable, id :', credentials.userId)
            return null
          }

          return {
            id:            user.id,
            name:          `${user.prenom} ${user.nom}`,
            email:         user.email,
            role:          user.role,
            telephone:     user.telephone     ?? null,
            vendeurStatut: user.vendeurProfile?.statut ?? null,
          }

        } catch (error) {
          console.error('[authorize:google-native] Erreur inattendue :', error)
          return null
        }
      },
    }),

    // ── 3. Google OAuth (web uniquement) ────────────────────────────────────
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const existing = await prisma.user.findFirst({
            where: { email: user.email ?? '' },
          })

          if (existing) {
            // ✅ Compte existant → connexion normale
            return true
          }

          // 🆕 Nouveau compte Google → token temporaire + redirection finalisation
          const tempToken = crypto.randomBytes(32).toString('hex')
          const email     = user.email ?? ''
          const name      = user.name  ?? ''

          // Nettoyer d'éventuels anciens tokens pour cet email
          const oldTokens = await prisma.otpToken.findMany({
            where: { identifiant: { startsWith: 'google_oauth_' } },
          })
          for (const t of oldTokens) {
            try {
              const d = JSON.parse(t.data)
              if (d.email === email) {
                await prisma.otpToken.delete({ where: { id: t.id } })
              }
            } catch { /* ignored */ }
          }

          await prisma.otpToken.create({
            data: {
              identifiant: `google_oauth_${tempToken}`,
              token:       '',
              expiresAt:   new Date(Date.now() + 30 * 60 * 1000),
              data:        JSON.stringify({ email, name }),
            },
          })

          const base = isProd ? PROD_URL : ''
          return `${base}/inscription/finaliser-google?token=${tempToken}`

        } catch (err) {
          console.error('[signIn:google] Erreur OAuth :', err)
          return false
        }
      }
      return true
    },

    async jwt({ token, user, account }) {
      // ── Premier appel après connexion : user est défini ──
      if (user) {
        token.id            = user.id!
        token.role          = user.role
        token.telephone     = user.telephone     ?? null
        token.vendeurStatut = user.vendeurStatut ?? null
      }

      // ── Google OAuth : enrichir le token depuis la DB ──
      if (account?.provider === 'google' && token.email) {
        try {
          const dbUser = await prisma.user.findFirst({
            where: { email: token.email },
            include: { vendeurProfile: true },
          })
          if (dbUser) {
            token.id            = dbUser.id
            token.role          = dbUser.role
            token.telephone     = dbUser.telephone ?? null
            token.vendeurStatut = dbUser.vendeurProfile?.statut ?? null
          }
        } catch (err) {
          console.error('[jwt:google] Erreur enrichissement token :', err)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id            = token.id            as string
        session.user.role          = token.role          as string
        session.user.telephone     = token.telephone     ?? null
        session.user.vendeurStatut = token.vendeurStatut ?? null
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      const base = isProd ? PROD_URL : baseUrl
      if (url.startsWith('/'))    return `${base}${url}`
      if (url.startsWith(base))   return url
      if (isProd && url.includes('localhost')) return base
      return base
    },
  },
})