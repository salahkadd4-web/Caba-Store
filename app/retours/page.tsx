import { auth }     from '@/auth'
import { redirect } from 'next/navigation'

import ClientRetourView     from '@/components/retours/ClientRetourView'
import DashboardRetoursView from '@/components/retours/DashboardRetoursView'

export const dynamic = 'force-dynamic'

export default async function RetoursPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const role    = session.user.role as string
  const isAdmin = role === 'ADMIN'

  if (role === 'CLIENT') {
    const { orderId } = await searchParams
    return <ClientRetourView orderId={orderId ?? ''} />
  }

  if (isAdmin || role === 'VENDEUR') return <DashboardRetoursView isAdmin={isAdmin} />

  redirect('/')
}
