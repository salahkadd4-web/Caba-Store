import type { NextAuthConfig } from 'next-auth'

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
  },

  providers: [],
} satisfies NextAuthConfig