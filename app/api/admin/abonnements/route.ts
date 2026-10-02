import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'
//app\api\admin\abonnements\route.ts
export async function GET(req: NextRequest) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })

  const statut = req.nextUrl.searchParams.get('statut') || undefined
  const now = new Date()
  const STATUTS_VALIDES = ['GRATUIT', 'ACTIF', 'EXPIRE', 'SUSPENDU'] as const
    type StatutAbo = typeof STATUTS_VALIDES[number]

    const statutFiltre = STATUTS_VALIDES.includes(statut as StatutAbo)
    ? (statut as StatutAbo)
    : undefined

  const abonnements = await prisma.abonnement.findMany({
    where: statutFiltre ? { statut: statutFiltre } : undefined,
    orderBy: { dateFin: 'asc' },
    include: {
      vendeur: {
        select: {
          nomBoutique: true,
          user: { select: { nom: true, prenom: true, email: true } },
        },
      },
    },
  })

  const rows = abonnements.map(a => ({
    ...a,
    joursRestants: Math.max(0, Math.ceil(
      (new Date(a.dateFin).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )),
  }))

  return NextResponse.json(rows)
}