import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import AbonnementsClient from './AbonnementsClient'

export const dynamic = 'force-dynamic'

export default async function AdminAbonnementsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/connexion')

  const now = new Date()

  const abonnements = await prisma.abonnement.findMany({
    orderBy: { dateFin: 'asc' },
    include: {
      vendeur: {
        select: {
          nomBoutique: true,
          user: { select: { nom: true, prenom: true, email: true } },
        },
      },
    },
  })

  const data = abonnements.map(a => ({
    ...a,
    dateFin:      a.dateFin.toISOString(),
    createdAt:    a.createdAt.toISOString(),
    updatedAt:    a.updatedAt.toISOString(),
    joursRestants: Math.max(0, Math.ceil(
      (a.dateFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )),
  }))

  return <AbonnementsClient initialData={data} />
}
