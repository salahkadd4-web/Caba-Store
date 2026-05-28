import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import VendeursClient from './VendeursClient'

export const dynamic = 'force-dynamic'

export default async function AdminVendeursPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/connexion')

  const vendeurs = await prisma.vendeurProfile.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user:      { select: { id: true, nom: true, prenom: true, email: true, telephone: true, createdAt: true } },
      documents: true,
      _count:    { select: { products: true, categories: true } },
    },
  })

  // Fix N+1 : CA et commandes par vendeur en 2 requêtes groupées
  const [caRows, cmdRows] = await Promise.all([
    prisma.$queryRaw<{ vendeur_id: string; ca: number }[]>`
      SELECT p."vendeurId" AS vendeur_id,
             COALESCE(SUM(oi.prix * oi.quantite), 0)::float AS ca
      FROM   "OrderItem" oi
      JOIN   "Product"   p ON p.id = oi."productId"
      JOIN   "Order"     o ON o.id = oi."orderId"
      WHERE  o.statut = 'LIVREE' AND p."vendeurId" IS NOT NULL
      GROUP  BY p."vendeurId"
    `,
    prisma.$queryRaw<{ vendeur_id: string; nb: number }[]>`
      SELECT p."vendeurId" AS vendeur_id, COUNT(oi.id)::int AS nb
      FROM   "OrderItem" oi
      JOIN   "Product"   p ON p.id = oi."productId"
      WHERE  p."vendeurId" IS NOT NULL
      GROUP  BY p."vendeurId"
    `,
  ])

  const caMap  = new Map(caRows.map(r => [r.vendeur_id, r.ca]))
  const cmdMap = new Map(cmdRows.map(r => [r.vendeur_id, r.nb]))

  const data = vendeurs.map(v => ({
    ...v,
    createdAt:       v.createdAt.toISOString(),
    user:            { ...v.user, createdAt: v.user.createdAt.toISOString() },
    documents:       v.documents.map(d => ({ ...d, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString() })),
    chiffreAffaire:  caMap.get(v.id)  ?? 0,
    totalCommandes:  cmdMap.get(v.id) ?? 0,
  }))

  return <VendeursClient initialData={data} />
}
