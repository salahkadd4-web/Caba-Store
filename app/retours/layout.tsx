import { auth }       from '@/auth'
import { redirect }   from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function RetoursLayout({
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

  return <>{children}</>
}
