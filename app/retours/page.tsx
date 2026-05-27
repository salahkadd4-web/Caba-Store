import { auth }     from '@/auth'
import { redirect } from 'next/navigation'

import ClientRetourView   from '@/components/retours/ClientRetourView'
import DashboardRetoursView from '@/components/retours/DashboardRetoursView'

/**
 * /retours — page unique qui dispatche selon le rôle :
 *  - CLIENT  → formulaire de demande de retour
 *  - ADMIN   → liens Flowmerce (vue globale)
 *  - VENDEUR → info : retours gérés par CabaStore
 */
export default async function RetoursPage() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const role    = session.user.role as string
  const isAdmin = role === 'ADMIN'

  if (role === 'CLIENT') {
    return <ClientRetourView />
  }

  if (isAdmin || role === 'VENDEUR') {
    return <DashboardRetoursView isAdmin={isAdmin} />
  }

  redirect('/')
}
