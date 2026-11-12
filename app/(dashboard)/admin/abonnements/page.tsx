import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listeAbonnementsAdmin } from '@/lib/seller-billing'
import AbonnementsClient from './AbonnementsClient'

export const dynamic = 'force-dynamic'

export default async function AdminAbonnementsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/connexion')
  return <AbonnementsClient initialData={await listeAbonnementsAdmin()} />
}
