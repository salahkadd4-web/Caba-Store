import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AlertTriangle, CheckCircle2, Clock, CreditCard, XCircle } from 'lucide-react'

const TARIFS = {
  NIVEAU_1: { mensuel: 2500,  annuel: 25000, label: 'Niveau 1', desc: 'Priorité haute' },
  NIVEAU_2: { mensuel: 2000,  annuel: 20000, label: 'Niveau 2', desc: 'Priorité moyenne' },
  NIVEAU_3: { mensuel: 1500,  annuel: 15000, label: 'Niveau 3', desc: 'Priorité standard' },
}

const NIVEAU_COLOR: Record<string, string> = {
  NIVEAU_1: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  NIVEAU_2: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  NIVEAU_3: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
}

export default async function VendeurAbonnementPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') redirect('/connexion')

  const profile = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      abonnement: {
        include: { paiements: { orderBy: { createdAt: 'desc' }, take: 10 } },
      },
    },
  })

  if (!profile || profile.statut !== 'APPROUVE') redirect('/vendeur/statut')

  const abo = profile.abonnement
  const now = new Date()
  const joursRestants = abo
    ? Math.max(0, Math.ceil((new Date(abo.dateFin).getTime() - now.getTime()) / 86400000))
    : 0

  const statutConfig = {
    GRATUIT:  { label: 'Période gratuite', color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
    ACTIF:    { label: 'Abonnement actif', color: 'text-teal-600 dark:text-teal-400',       icon: CheckCircle2, bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800' },
    EXPIRE:   { label: 'Abonnement expiré', color: 'text-red-600 dark:text-red-400',        icon: XCircle,      bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' },
    SUSPENDU: { label: 'Suspendu',          color: 'text-orange-600 dark:text-orange-400',  icon: AlertTriangle, bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' },
  }

  const sc   = abo ? statutConfig[abo.statut as keyof typeof statutConfig] : null
  const Icon = sc?.icon ?? Clock

  const progressPct = abo && abo.statut !== 'EXPIRE'
    ? Math.min(100, (joursRestants / 365) * 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-stone-800 dark:text-stone-100">Mon Abonnement</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Gérez votre abonnement vendeur</p>
        </div>
      </div>

      {/* Statut actuel */}
      {abo && sc ? (
        <div className={`border rounded-2xl p-5 ${sc.bg}`}>
          <div className="flex items-center gap-3 mb-4">
            <Icon className={`w-6 h-6 ${sc.color}`} />
            <div>
              <p className={`text-lg font-bold ${sc.color}`}>{sc.label}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {abo.statut === 'EXPIRE'
                  ? `Expiré le ${new Date(abo.dateFin).toLocaleDateString('fr-DZ')}`
                  : `Expire le ${new Date(abo.dateFin).toLocaleDateString('fr-DZ')} — ${joursRestants} jour${joursRestants > 1 ? 's' : ''} restant${joursRestants > 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>

          {/* Barre de progression */}
          {abo.statut !== 'EXPIRE' && (
            <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all ${joursRestants <= 7 ? 'bg-orange-500' : 'bg-teal-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3">
              <p className="text-stone-500 dark:text-stone-400 text-xs mb-0.5">Niveau</p>
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                {TARIFS[abo.niveau as keyof typeof TARIFS]?.label ?? abo.niveau}
              </p>
              <span className={`mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${NIVEAU_COLOR[abo.niveau] ?? ''}`}>
                {TARIFS[abo.niveau as keyof typeof TARIFS]?.desc ?? ''}
              </span>
            </div>
            <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3">
              <p className="text-stone-500 dark:text-stone-400 text-xs mb-0.5">Périodicité</p>
              <p className="font-semibold text-stone-900 dark:text-stone-100 capitalize">
                {abo.periodicite ?? 'Offert'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 text-stone-300" />
          <p className="text-stone-500 dark:text-stone-400">Aucun abonnement trouvé.</p>
        </div>
      )}

      {/* Alerte renouvellement */}
      {abo && (abo.statut === 'EXPIRE' || joursRestants <= 14) && (
        <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
          <p className="font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2 mb-1 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {abo.statut === 'EXPIRE'
              ? 'Votre abonnement a expiré — vos produits ne sont plus affichés.'
              : `Votre abonnement expire dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}.`}
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400">
            Contactez l&apos;administration pour renouveler votre abonnement.
          </p>
        </div>
      )}

      {/* Grille des plans */}
      <div>
        <h2 className="text-base font-bold text-stone-700 dark:text-stone-200 mb-3">Nos plans d&apos;abonnement</h2>
        <div className="grid gap-3">
          {(Object.entries(TARIFS) as [string, typeof TARIFS[keyof typeof TARIFS]][]).map(([key, t]) => {
            const isActuel = abo?.niveau === key
            return (
              <div key={key}
                className={`rounded-2xl border p-4 flex justify-between items-center transition ${
                  isActuel
                    ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-600'
                }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{t.label}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${NIVEAU_COLOR[key] ?? ''}`}>
                      {t.desc}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    <span className="font-bold text-stone-800 dark:text-stone-100">{t.mensuel.toLocaleString('fr-DZ')} DA</span>
                    {' '}/mois
                    <span className="ml-3 text-xs text-stone-400">ou {t.annuel.toLocaleString('fr-DZ')} DA/an</span>
                  </p>
                </div>
                {isActuel && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900 px-3 py-1.5 rounded-full shrink-0">
                    Plan actuel
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-stone-400 mt-3 text-center">
          Pour changer de plan ou renouveler, contactez l&apos;administration.
        </p>
      </div>

      {/* Historique paiements */}
      {abo && abo.paiements.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-stone-700 dark:text-stone-200 mb-3">Historique des paiements</h2>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
            {abo.paiements.map(p => (
              <div key={p.id} className="flex justify-between items-center px-5 py-3.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800/40 transition">
                <div>
                  <span className="font-semibold text-stone-800 dark:text-stone-100">{p.montant.toLocaleString('fr-DZ')} DA</span>
                  <span className="text-stone-400 ml-2 text-xs capitalize">{p.methode}</span>
                  {p.reference && <span className="text-stone-400 ml-1 text-xs">· réf. {p.reference}</span>}
                </div>
                <span className="text-stone-400 text-xs">{new Date(p.dateReglement).toLocaleDateString('fr-DZ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
