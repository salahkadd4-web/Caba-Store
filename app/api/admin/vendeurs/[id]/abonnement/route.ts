import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const TARIFS = {
  NIVEAU_1: { mensuel: 2500, annuel: 25000 },
  NIVEAU_2: { mensuel: 2000, annuel: 20000 },
  NIVEAU_3: { mensuel: 1500, annuel: 15000 },
}

const NIVEAU_TO_PRIORITE: Record<string, number> = {
  NIVEAU_0: 0, NIVEAU_1: 1, NIVEAU_2: 2, NIVEAU_3: 3,
}

// GET — détail abonnement
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  const abonnement = await prisma.abonnement.findUnique({
    where: { vendeurId: id },
    include: { paiements: { orderBy: { createdAt: 'desc' }, take: 10 } },
  })
  return NextResponse.json(abonnement)
}

// POST — renouveler / changer de niveau + confirmer paiement
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { niveau, periodicite, montant, methode, reference, note } = body
  // niveau: "NIVEAU_1"|"NIVEAU_2"|"NIVEAU_3"
  // periodicite: "mensuel"|"annuel"

  const abonnement = await prisma.abonnement.findUnique({ where: { vendeurId: id } })
  if (!abonnement)
    return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 })

  // Calculer nouvelle dateFin
  const base = abonnement.statut === 'EXPIRE' ? new Date() : new Date(abonnement.dateFin)
  const dateFin = new Date(base)
  if (periodicite === 'annuel') dateFin.setFullYear(dateFin.getFullYear() + 1)
  else dateFin.setMonth(dateFin.getMonth() + 1)

  const priorite = NIVEAU_TO_PRIORITE[niveau] ?? 3

  await prisma.$transaction([
    prisma.abonnement.update({
      where: { id: abonnement.id },
      data: { niveau, statut: 'ACTIF', dateFin, periodicite },
    }),
    prisma.vendeurProfile.update({
      where: { id },
      data: { prioriteAffichage: priorite },
    }),
    prisma.paiement.create({
      data: {
        abonnementId: abonnement.id,
        montant: montant ?? TARIFS[niveau as keyof typeof TARIFS][periodicite as 'mensuel' | 'annuel'],
        methode,
        reference: reference || null,
        note: note || null,
        confirmeParAdmin: true,
      },
    }),
  ])

  return NextResponse.json({ message: `Abonnement ${niveau} activé jusqu'au ${dateFin.toLocaleDateString('fr-DZ')}` })
}

// PATCH — changer niveau uniquement (sans paiement supplémentaire)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  const { niveau } = await req.json()
  const priorite = NIVEAU_TO_PRIORITE[niveau] ?? 3

  await prisma.$transaction([
    prisma.abonnement.update({ where: { vendeurId: id }, data: { niveau } }),
    prisma.vendeurProfile.update({ where: { id }, data: { prioriteAffichage: priorite } }),
  ])

  return NextResponse.json({ message: 'Niveau mis à jour' })
}