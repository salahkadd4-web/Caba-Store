import Link from 'next/link'
import { AlertTriangle, Lock } from 'lucide-react'
import { getI18n } from '@/lib/i18n/server'
import { getRappelPaiement } from '@/lib/seller-billing'

/**
 * Bandeau discret en haut des pages vendeur pendant le mois de paiement :
 * « Il vous reste xx jours pour régler … ». Rouge seulement si le compte est bloqué.
 */
export default async function RappelPaiementBanner({ vendeurId }: { vendeurId: string }) {
  const [rappel, { t, fmt }] = await Promise.all([getRappelPaiement(vendeurId), getI18n()])
  if (!rappel) return null
  const b = t.billing
  const Icon = rappel.bloque ? Lock : AlertTriangle

  return (
    <div className={`mb-5 rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between text-sm ${
      rappel.bloque
        ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
        : 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
    }`}>
      <p className="flex items-center gap-2 font-medium">
        <Icon className="w-4 h-4 shrink-0" />
        {rappel.bloque
          ? b.bannerBlocked(fmt.price(rappel.total))
          : b.bannerDue(fmt.price(rappel.total), rappel.joursRestants)}
      </p>
      <Link href="/vendeur/abonnement" className="font-semibold hover:underline shrink-0">
        {b.bannerLink}
      </Link>
    </div>
  )
}
