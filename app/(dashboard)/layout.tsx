import { redirect } from 'next/navigation'
import { auth }     from '@/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'

/**
 * Layout dashboard (admin + vendeur) — Server Component.
 *
 * La protection par rôle est déjà gérée par le middleware, mais on
 * vérifie ici côté serveur pour éviter tout flash de contenu non autorisé
 * et pour passer les données de session au shell client.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/connexion')
  }

  const role = session.user.role as string
  if (role !== 'ADMIN' && role !== 'VENDEUR') {
    redirect('/')
  }

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
