import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import CategoriesClient from './CategoriesClient'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/connexion')

  const categories = await prisma.category.findMany({
    orderBy: { nom: 'asc' },
    include: {
      _count:  { select: { products: true } },
      vendeur: { select: { id: true, nomBoutique: true, user: { select: { nom: true, prenom: true } } } },
    },
  })

  return <CategoriesClient initialData={categories} />
}
