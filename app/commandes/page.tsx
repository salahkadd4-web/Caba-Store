import { auth }     from '@/auth'
import { redirect } from 'next/navigation'
import { prisma }   from '@/lib/prisma'

// Vues client et dashboard importées depuis components/
import ClientCommandesView   from '@/components/commandes/ClientCommandesView'
import DashboardCommandesView from '@/components/commandes/DashboardCommandesView'

/**
 * /commandes — page unique qui dispatche selon le rôle :
 *  - CLIENT  → liste de ses propres commandes (vue client)
 *  - ADMIN   → toutes les commandes (vue dashboard)
 *  - VENDEUR → commandes de ses produits (vue dashboard)
 */
export default async function CommandesPage() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const role    = session.user.role as string
  const isAdmin = role === 'ADMIN'

  // ── Vue Client ───────────────────────────────────────────────────────────
  if (role === 'CLIENT') {
    return <ClientCommandesView />
  }

  // ── Vue Dashboard (Admin + Vendeur) ──────────────────────────────────────
  if (isAdmin || role === 'VENDEUR') {
    const baseInclude = {
      user:  { select: { nom: true, prenom: true, email: true } },
      items: { select: { id: true } },
    } as const

    const commandes = isAdmin
      ? await prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take:    50,
          include: baseInclude,
        })
      : await prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take:    50,
          where: {
            items: {
              some: {
                product: {
                  vendeur: { userId: session.user.id },
                },
              },
            },
          },
          include: baseInclude,
        })

    return <DashboardCommandesView commandes={commandes} isAdmin={isAdmin} />
  }

  redirect('/')
}
