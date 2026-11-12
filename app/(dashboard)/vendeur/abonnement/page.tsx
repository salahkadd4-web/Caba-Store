import { auth }     from '@/auth'
import { redirect } from 'next/navigation'
import { prisma }   from '@/lib/prisma'
import { CalendarClock, CreditCard, Lock, Percent, Receipt } from 'lucide-react'
import { getEtatFacturation } from '@/lib/seller-billing'
import { prioriteDuNiveau } from '@/lib/billing-offers'
import { getI18n } from '@/lib/i18n/server'
import OffreChooser from '@/components/billing/OffreChooser'
import FactureCard from '@/components/billing/FactureCard'
import { libelleOffre } from '@/components/billing/labels'

export const dynamic = 'force-dynamic'

const section = 'rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5'
const sectionTitle = 'text-base font-bold text-stone-800 dark:text-stone-100'

export default async function VendeurAbonnementPage() {
  const [session, { t, fmt }] = await Promise.all([auth(), getI18n()])
  if (!session?.user || session.user.role !== 'VENDEUR') redirect('/connexion')
  const b = t.billing

  const profile = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, nomBoutique: true },
  })
  // Le layout (vendeur/layout.tsx) bloque les vendeurs non approuvés avant d'atteindre cette page.
  if (!profile) return null

  const etat = await getEtatFacturation(profile.id)
  const sellerName = profile.nomBoutique || session.user.name || b.sellerFallback

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-stone-600 dark:text-stone-300" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-stone-800 dark:text-stone-100">{b.title}</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">{b.subtitle}</p>
        </div>
      </div>

      {!etat ? (
        <div className="bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 text-center">
          <p className="text-stone-500 dark:text-stone-400">{b.noSubscription}</p>
        </div>
      ) : (
        <>
          {/* Compte bloqué */}
          {etat.statut === 'BLOQUE' && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-5">
              <p className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" /> {b.blockedTitle}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{b.blockedDesc(fmt.price(etat.totalAPayer))}</p>
            </div>
          )}

          {/* Offre actuelle */}
          <div className={section}>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">{b.currentOffer}</p>
            <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">{libelleOffre(t, etat)}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
              <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-3">
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{b.displayPriority}</p>
                <p className="font-medium text-stone-800 dark:text-stone-100">{b.priorityN(prioriteDuNiveau(etat.niveau))}</p>
              </div>
              <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-3">
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">
                  {etat.mode === 'FORFAIT' && etat.forfaitFin ? b.forfaitEnds : b.currentCycle}
                </p>
                <p className="font-medium text-stone-800 dark:text-stone-100">
                  {etat.mode === 'FORFAIT' && etat.forfaitFin
                    ? fmt.date(etat.forfaitFin)
                    : b.periodRange(fmt.date(etat.cycleDebut), fmt.date(etat.cycleFin))}
                </p>
              </div>
            </div>
          </div>

          {/* À régler */}
          <div className={section}>
            <h2 className={`${sectionTitle} flex items-center gap-2 mb-1`}>
              <Receipt className="w-4 h-4 text-stone-500" /> {b.toPay}
            </h2>
            {etat.aPayer.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">{b.nothingToPay}</p>
            ) : (
              <>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">{b.howToPay}</p>
                <div className="space-y-3">
                  {etat.aPayer.map(f => <FactureCard key={f.id} facture={f} sellerName={sellerName} />)}
                </div>
              </>
            )}
            {etat.avoir > 0 && (
              <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3">
                {b.creditAvailable(fmt.price(etat.avoir))}
              </p>
            )}
            {etat.forfaitAVenir && (
              <p className="mt-3 text-sm text-stone-600 dark:text-stone-300 rounded-xl bg-stone-50 dark:bg-stone-800/70 p-3">
                {b.forfaitPending(fmt.price(etat.forfaitAVenir.montant))}
              </p>
            )}
          </div>

          {/* Commission du cycle en cours */}
          {etat.commissionEnCours && (
            <div className={section}>
              <h2 className={`${sectionTitle} flex items-center gap-2 mb-3`}>
                <Percent className="w-4 h-4 text-stone-500" /> {b.commissionThisCycle}
              </h2>
              <p className="text-2xl font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                {fmt.price(etat.commissionEnCours.montant)}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                {b.commissionDetail(
                  Math.round(etat.commissionEnCours.taux * 100),
                  fmt.price(etat.commissionEnCours.ventesBrutes),
                  etat.commissionEnCours.nbCommandes,
                )}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 shrink-0" /> {b.commissionBilledOn(fmt.date(etat.cycleFin))}
              </p>
            </div>
          )}

          {/* Choix de l'offre */}
          <div className={section}>
            <h2 className={`${sectionTitle} mb-3`}>{b.chooseOffer}</h2>
            <OffreChooser
              endpoint="/api/vendeur/abonnement"
              method="POST"
              actuelle={{ mode: etat.mode, niveau: etat.niveau, periodicite: etat.periodicite }}
              prochaine={etat.prochaineOffre}
              dateEffet={etat.prochaineOffre?.dateEffet ?? etat.dateEffetChangement}
            />
          </div>

          {/* Historique */}
          <div>
            <h2 className={`${sectionTitle} mb-3`}>{b.history}</h2>
            {etat.historique.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">{b.noInvoices}</p>
            ) : (
              <div className="space-y-3">
                {etat.historique.map(f => <FactureCard key={f.id} facture={f} sellerName={sellerName} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
