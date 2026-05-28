import { auth }     from '@/auth'
import { redirect } from 'next/navigation'
import { prisma }   from '@/lib/prisma'

export const dynamic = 'force-dynamic'

import ClientCommandesView   from '@/components/commandes/ClientCommandesView'
import DashboardCommandesView from '@/components/commandes/DashboardCommandesView'

const itemInclude = {
  product: { select: { id: true, nom: true, images: true, prix: true, prixVariables: true } },
  variant: { select: { id: true, nom: true, couleur: true, images: true } },
} as const

const userSelect = {
  select: { nom: true, prenom: true, email: true, telephone: true },
} as const

export default async function CommandesPage() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const role    = session.user.role as string
  const isAdmin = role === 'ADMIN'

  if (role === 'CLIENT') {
    return <ClientCommandesView />
  }

  if (isAdmin || role === 'VENDEUR') {
    const commandes = isAdmin
      ? await prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take:    50,
          include: { user: userSelect, items: { include: itemInclude } },
        })
      : await prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take:    50,
          where: { items: { some: { product: { vendeur: { userId: session.user.id } } } } },
          include: { user: userSelect, items: { where: { product: { vendeur: { userId: session.user.id } } }, include: itemInclude } },
        })

    const commandesAvecTotal = commandes.map(cmd => ({
      ...cmd,
      approbationsVendeurs: (cmd.approbationsVendeurs ?? undefined) as Record<string, boolean> | undefined,
      totalVendeur: cmd.items.reduce((sum, item) => sum + item.prix * item.quantite, 0),
    }))

    return <DashboardCommandesView commandes={commandesAvecTotal} isAdmin={isAdmin} />
  }

  redirect('/')
}
