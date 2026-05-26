import type { NextAuthConfig } from 'next-auth'

const isProd = process.env.NODE_ENV === 'production'

/**
 * Config allégée — sans Prisma, compatible Edge/Middleware.
 * Les providers réels (Credentials, Google) sont dans auth.ts.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET,

  useSecureCookies: isProd,
  cookies: {
    sessionToken: {
      name: isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: isProd,
      },
    },
  },

  pages: {
    signIn:  '/connexion',
    signOut: '/',
    error:   '/connexion',
  },

  session: {
    strategy: 'jwt' as const,
  },

  callbacks: {
    // Le token JWT est enrichi dans auth.ts (jwt callback complet)
    // Ici on expose juste les champs dans la session
    async session({ session, token }) {
      if (token) {
        session.user.id        = token.id   as string
        session.user.role      = token.role as string
        session.user.telephone = token.telephone ?? null
      }
      return session
    },
  },

  providers: [], // les providers sont ajoutés dans auth.ts
} satisfies NextAuthConfig
