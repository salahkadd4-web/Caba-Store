import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AlertTriangle, CheckCircle2, Clock, CreditCard, XCircle } from 'lucide-react'

const TARIFS = {
  NIVEAU_1: { mensuel: 2500,  annuel: 25000, label: 'Niveau 1 — Priorité haute' },
  NIVEAU_2: { mensuel: 2000,  annuel: 20000, label: 'Niveau 2 — Priorité moyenne' },
  NIVEAU_3: { mensuel: 1500,  annuel: 15000, label: 'Niveau 3 — Priorité standard' },
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
    GRATUIT:  { label: 'Période gratuite', color: 'text-green-600',  icon: CheckCircle2, bg: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' },
    ACTIF:    { label: 'Abonnement actif', color: 'text-teal-600',   icon: CheckCircle2, bg: 'bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800' },
    EXPIRE:   { label: 'Abonnement expiré', color: 'text-red-600',   icon: XCircle,      bg: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' },
    SUSPENDU: { label: 'Suspendu',          color: 'text-orange-600', icon: AlertTriangle, bg: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' },
  }

  const sc = abo ? statutConfig[abo.statut as keyof typeof statutConfig] : null
  const Icon = sc?.icon ?? Clock

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <CreditCard size={22} /> Mon Abonnement
      </h1>

      {/* Statut actuel */}
      {abo && sc ? (
        <div className={`border rounded-xl p-5 ${sc.bg}`}>
          <div className="flex items-center gap-3 mb-4">
            <Icon className={sc.color} size={24} />
            <div>
              <p className={`text-lg font-bold ${sc.color}`}>{sc.label}</p>
              <p className="text-sm text-gray-500">
                {abo.statut === 'EXPIRE'
                  ? `Expiré le ${new Date(abo.dateFin).toLocaleDateString('fr-DZ')}`
                  : `Expire le ${new Date(abo.dateFin).toLocaleDateString('fr-DZ')} — ${joursRestants} jours restants`}
              </p>
            </div>
          </div>

          {/* Barre de progression */}
          {abo.statut !== 'EXPIRE' && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all ${joursRestants <= 7 ? 'bg-orange-500' : 'bg-teal-500'}`}
                style={{ width: `${Math.min(100, (joursRestants / 365) * 100)}%` }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-0.5">Niveau</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {TARIFS[abo.niveau as keyof typeof TARIFS]?.label ?? abo.niveau}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-0.5">Périodicité</p>
              <p className="font-semibold text-gray-900 dark:text-white capitalize">
                {abo.periodicite ?? 'Offert'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 text-center text-gray-500">
          Aucun abonnement trouvé.
        </div>
      )}

      {/* Alerte renouvellement */}
      {abo && (abo.statut === 'EXPIRE' || joursRestants <= 14) && (
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-300">
          <p className="font-semibold flex items-center gap-2 mb-1">
            <AlertTriangle size={15} />
            {abo.statut === 'EXPIRE' ? 'Votre abonnement a expiré — vos produits ne sont plus affichés.' : `Votre abonnement expire dans ${joursRestants} jours.`}
          </p>
          <p>Contactez-nous pour renouveler votre abonnement.</p>
        </div>
      )}

      {/* Grille des plans */}
      <div>
        <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Nos plans d&apos;abonnement</h2>
        <div className="grid gap-4">
          {(Object.entries(TARIFS) as [string, typeof TARIFS[keyof typeof TARIFS]][]).map(([key, t]) => {
            const isActuel = abo?.niveau === key
            return (
              <div
                key={key}
                className={`border rounded-xl p-4 flex justify-between items-center
                  ${isActuel
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-600'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'}`}
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{t.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="font-bold text-gray-800 dark:text-gray-100">{t.mensuel.toLocaleString('fr-DZ')} DA</span> /mois
                    <span className="ml-3 text-xs">ou {t.annuel.toLocaleString('fr-DZ')} DA/an</span>
                  </p>
                </div>
                {isActuel && (
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900 px-2 py-1 rounded-full">
                    Plan actuel
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Pour changer de plan ou renouveler, contactez l&apos;administration.
        </p>
      </div>

      {/* Historique paiements */}
      {abo && abo.paiements.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Historique des paiements</h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {abo.paiements.map(p => (
              <div key={p.id} className="flex justify-between items-center px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{p.montant.toLocaleString('fr-DZ')} DA</span>
                  <span className="text-gray-400 ml-2 text-xs capitalize">{p.methode}</span>
                  {p.reference && <span className="text-gray-400 ml-1 text-xs">· réf. {p.reference}</span>}
                </div>
                <span className="text-gray-400 text-xs">{new Date(p.dateReglement).toLocaleDateString('fr-DZ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}