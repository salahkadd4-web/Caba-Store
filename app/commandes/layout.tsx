import { auth }          from '@/auth'
import { redirect }      from 'next/navigation'
import DashboardShell    from '@/components/dashboard/DashboardShell'

/**
 * Layout /commandes
 *
 * - CLIENT  → pas de layout spécial, le root layout (Nav + Footer) suffit
 * - ADMIN / VENDEUR → DashboardShell (sidebar + topbar)
 *   Le root layout affiche Nav + Footer, mais Nav.tsx se masque automatiquement
 *   sur /commandes pour ces rôles. On wrap ici dans DashboardShell pour avoir
 *   la sidebar et le topbar dashboard.
 */
export default async function CommandesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const role = session.user.role as string

  if (role === 'ADMIN' || role === 'VENDEUR') {
    const nomBoutique =
      (session.user as { nomBoutique?: string }).nomBoutique ?? null

    return (
      <DashboardShell
        role={role as 'ADMIN' | 'VENDEUR'}
        nomBoutique={nomBoutique}
        userName={session.user.name ?? ''}
      >
        {children}
      </DashboardShell>
    )
  }

  // CLIENT : pas de wrapper dashboard, le root layout s'en charge
  return <>{children}</>
}
