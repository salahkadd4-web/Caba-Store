import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  // Sécurité : seul Vercel Cron peut appeler cette route.
  // Si CRON_SECRET n'est pas défini, on REFUSE — sinon `Bearer undefined`
  // matcherait `Bearer undefined` (CWE-1188).
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = new Date()

  // 1. Trouver abonnements expirés (GRATUIT ou ACTIF dont dateFin < now)
  //    → EXCLURE NIVEAU_0 (réservé à l'admin, permanent)
  const expires = await prisma.abonnement.findMany({
    where: {
      statut: { in: ['GRATUIT', 'ACTIF'] },
      dateFin: { lt: now },
      niveau: { not: 'NIVEAU_0' }, // ← protéger l'admin
    },
    select: { id: true, vendeurId: true },
  })

  if (expires.length > 0) {
    const vendeurIds = expires.map(a => a.vendeurId)
    const abonnementIds = expires.map(a => a.id)

    await prisma.$transaction([
      // Marquer abonnements comme EXPIRÉ
      prisma.abonnement.updateMany({
        where: { id: { in: abonnementIds } },
        data: { statut: 'EXPIRE' },
      }),
      // Remettre priorité au niveau le plus bas
      prisma.vendeurProfile.updateMany({
        where: { id: { in: vendeurIds } },
        data: { prioriteAffichage: 99 }, // 99 = hors abonnement, produits masqués
      }),
    ])
  }

  // 2. Alerte : abonnements qui expirent dans 7 jours (pour notifier)
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const bientotExpires = await prisma.abonnement.count({
    where: {
      statut: { in: ['GRATUIT', 'ACTIF'] },
      dateFin: { gte: now, lte: sevenDays },
      niveau: { not: 'NIVEAU_0' }, // ← protéger l'admin
    },
  })

  return NextResponse.json({
    expires: expires.length,
    bientotExpires,
    traitesLe: now.toISOString(),
  })
}