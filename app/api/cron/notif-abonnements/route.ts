import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotifAbonnement } from '@/lib/mail'

/**
 * GET /api/cron/notif-abonnements
 *
 * Appelé quotidiennement par Vercel Cron (vercel.json).
 * Pour chaque abonnement ACTIF ou GRATUIT (hors NIVEAU_0) :
 *   - Calcule le % de la période écoulée
 *   - Pour chaque seuil [25, 50, 75, 90] franchi et pas encore notifié
 *     → envoie un email au vendeur
 *     → ajoute le seuil dans notifsSent
 */

const SEUILS = [25, 50, 75, 90] as const

export async function GET(req: NextRequest) {
  // Sécurité Vercel Cron — refus si CRON_SECRET non défini (CWE-1188).
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = new Date()

  // Récupérer tous les abonnements actifs hors admin
  const abonnements = await prisma.abonnement.findMany({
    where: {
      statut: { in: ['ACTIF', 'GRATUIT'] },
      niveau: { not: 'NIVEAU_0' },
      dateFin: { gt: now }, // pas encore expirés
    },
    include: {
      vendeur: {
        include: {
          user: {
            select: { email: true, prenom: true, nom: true },
          },
        },
      },
    },
  })

  const resultats = {
    traites: 0,
    emailsEnvoyes: 0,
    erreurs: 0,
    details: [] as { vendeur: string; seuil: string; statut: 'ok' | 'erreur' }[],
  }

  for (const abo of abonnements) {
    const debut = abo.dateDebut.getTime()
    const fin   = abo.dateFin.getTime()
    const duree = fin - debut

    // Durée invalide (dateDebut >= dateFin) → ignorer
    if (duree <= 0) continue

    const ecoule = now.getTime() - debut
    const pourcent = Math.floor((ecoule / duree) * 100)

    const joursRestants = Math.ceil((fin - now.getTime()) / (1000 * 60 * 60 * 24))

    // Seuils franchis mais pas encore notifiés
    const dejaNotifies: string[] = abo.notifsSent ?? []
    const aNotifier = SEUILS.filter(
      (s) => pourcent >= s && !dejaNotifies.includes(String(s))
    )

    if (aNotifier.length === 0) {
      resultats.traites++
      continue
    }

    const { email, prenom, nom } = abo.vendeur.user

    // Ignorer si pas d'email
    if (!email) continue

    const nomBoutique = abo.vendeur.nomBoutique || `${prenom} ${nom}`

    for (const seuil of aNotifier) {
      try {
        await sendNotifAbonnement({
          email,
          prenom: prenom || nom,
          nomBoutique,
          niveau: abo.niveau,
          dateFin: abo.dateFin,
          seuil: String(seuil),
          joursRestants,
        })

        // Marquer ce seuil comme envoyé
        await prisma.abonnement.update({
          where: { id: abo.id },
          data: {
            notifsSent: [...dejaNotifies, String(seuil)],
          },
        })

        dejaNotifies.push(String(seuil)) // pour les prochaines itérations du même abo

        resultats.emailsEnvoyes++
        resultats.details.push({ vendeur: nomBoutique, seuil: `${seuil}%`, statut: 'ok' })
      } catch (err) {
        console.error(`[notif-abonnements] Erreur seuil ${seuil}% pour ${email}:`, err)
        resultats.erreurs++
        resultats.details.push({ vendeur: nomBoutique, seuil: `${seuil}%`, statut: 'erreur' })
      }
    }

    resultats.traites++
  }

  return NextResponse.json({
    ...resultats,
    executeLe: now.toISOString(),
  })
}