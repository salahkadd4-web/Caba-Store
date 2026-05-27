import type { NextAuthConfig } from 'next-auth'

const isProd = process.env.NODE_ENV === 'production'

export const authConfig = {
  secret:    process.env.AUTH_SECRET,
  trustHost: true,

  pages: {
    signIn:  '/connexion',
    signOut: '/',
    error:   '/connexion',
  },

  session: {
    strategy: 'jwt' as const,
    maxAge:   7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  // ── Cookie de session durci ────────────────────────────────────────────────
  cookies: {
    sessionToken: {
      name: isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path:     '/',
        secure:   isProd,
        maxAge:   7 * 24 * 60 * 60,
      },
    },
  },

  // ── Callbacks Edge-compatibles (pas de Prisma) ────────────────────────────
  // Ces callbacks sont exécutés dans le middleware (Edge Runtime).
  // Ils lisent le JWT et l'exposent dans session.user pour que le middleware
  // puisse vérifier le rôle sans accéder à la base de données.
  callbacks: {
    async jwt({ token, user }) {
      // Premier appel après connexion : user est défini
      if (user) {
        token.id            = user.id!
        token.role          = (user as { role?: string }).role          ?? 'CLIENT'
        token.telephone     = (user as { telephone?: string }).telephone ?? null
        token.vendeurStatut = (user as { vendeurStatut?: string }).vendeurStatut ?? null
      }
      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id            = token.id            as string
        session.user.role          = token.role          as string
        session.user.telephone     = (token.telephone    ?? null) as string | null
        session.user.vendeurStatut = (token.vendeurStatut ?? null) as string | null
      }
      return session
    },
  },

  providers: [],
} satisfies NextAuthConfig
