import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ClientsClient from './ClientsClient'

export const dynamic = 'force-dynamic'

export default async function AdminClientsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/connexion')

  const clients = await prisma.user.findMany({
    where:   { role: 'CLIENT' },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true, favorites: true } } },
  })

  // Sérialiser les dates pour le passage RSC → Client Component
  const data = clients.map(c => ({ ...c, createdAt: c.createdAt.toISOString() }))

  return <ClientsClient initialData={data} />
}
