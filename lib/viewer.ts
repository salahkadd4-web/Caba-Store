/**
 * lib/viewer.ts
 * -------------
 * Informations sur le visiteur courant utiles au classement des produits.
 */

import 'server-only'
import { cache } from 'react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeWilayaCode } from '@/lib/algeria'

/** Code de wilaya du visiteur connecté (profil), ou null. Mis en cache par requête. */
export const getViewerWilaya = cache(async (): Promise<string | null> => {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { wilaya: true } })
  return normalizeWilayaCode(user?.wilaya)
})
