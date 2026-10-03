import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import VendeurDocumentsClient from './VendeurDocumentsClient'
import { Ban, Loader2 } from 'lucide-react'
import { getI18n } from '@/lib/i18n/server'

// Composant serveur qui protège toutes les pages vendeur
// Si le vendeur n'est pas approuvé → on affiche la page de statut
export async function VendeurGuard({ children }: { children: React.ReactNode }) {
  const [session, { t }] = await Promise.all([auth(), getI18n()])
  const s = t.seller.status

  if (!session?.user || session.user.role !== 'VENDEUR') {
    redirect('/connexion')
  }

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
    include: { documents: { orderBy: { createdAt: 'asc' } } },
  })

  if (!vendeur) redirect('/connexion')

  // Compte approuvé → afficher la page normalement
  if (vendeur.statut === 'APPROUVE') {
    return <>{children}</>
  }

  // Compte en attente ou suspendu → page de statut
  if (vendeur.statut === 'EN_ATTENTE' || vendeur.statut === 'SUSPENDU') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center">
          {vendeur.statut === 'EN_ATTENTE' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                {s.pendingTitle}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {s.pendingDesc}
              </p>
              {vendeur.adminNote && (
                <p className="text-xs bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 rounded-xl p-3 mb-4">
                  {vendeur.adminNote}
                </p>
              )}
            </>
          ) : (
            <>
              <Ban className="w-14 h-14" />
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                {s.suspendedTitle}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {s.suspendedDesc}
              </p>
              {vendeur.adminNote && (
                <div className="text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-xl p-3 mb-4 text-start">
                  <p className="font-semibold mb-1">{s.reason}</p>
                  <p>{vendeur.adminNote}</p>
                </div>
              )}
            </>
          )}
          <Link
            href="/"
            className="inline-block mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {s.backToShopArrow}
          </Link>
        </div>
      </div>
    )
  }

  // PIECES_REQUISES → page d'upload des documents
  if (vendeur.statut === 'PIECES_REQUISES') {
    return <VendeurDocumentsClient vendeur={vendeur} />
  }

  return <>{children}</>
}
