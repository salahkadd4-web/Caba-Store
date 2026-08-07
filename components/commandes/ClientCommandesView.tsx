'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  Check, CheckCircle2, CreditCard, Loader2, Package, PartyPopper,
  Truck, Wrench, XCircle, Zap, Store, Building2,
  ChevronDown, ChevronUp, MapPin, PackageCheck,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type VendeurInfo = { id: string; nomBoutique: string | null } | null

type OrderItem = {
  id: string
  quantite: number
  prix: number
  product: { nom: string; images: string[]; vendeur: VendeurInfo }
}

type Order = {
  id: string
  statut: string
  total: number
  adresse: string
  modePaiement: string
  methodeExpedition: string
  fraisLivraison: number
  createdAt: string
  retourDemande: boolean
  groupeId: string | null
  items: OrderItem[]
}

type CommandeGroupe = {
  groupeId: string
  createdAt: string
  adresse: string
  modePaiement: string
  commandes: Order[]
  statutGroupe: string
  total: number
}

// ─── Config statuts ───────────────────────────────────────────────────────────

const statutConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  EN_ATTENTE:     { label: 'En attente',     color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-950',          icon: Loader2      },
  CONFIRMEE:      { label: 'Confirmée',      color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-950/50',        icon: CheckCircle2 },
  EN_PREPARATION: { label: 'En préparation', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-950',           icon: Wrench       },
  EXPEDIEE:       { label: 'Expédiée',       color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-950',               icon: Truck        },
  LIVREE:         { label: 'Livrée',         color: 'text-green-700 dark:text-green-400',   bg: 'bg-green-100 dark:bg-green-950',             icon: PackageCheck },
  ANNULEE:        { label: 'Annulée',        color: 'text-red-700 dark:text-red-400',       bg: 'bg-red-100 dark:bg-red-950',                 icon: XCircle      },
}

const STATUT_ORDER = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStatutGroupe(commandes: Order[]): string {
  const actives = commandes.filter(c => c.statut !== 'ANNULEE')
  if (actives.length === 0) return 'ANNULEE'
  if (actives.every(c => c.statut === 'LIVREE')) return 'LIVREE'
  if (actives.every(c => ['EXPEDIEE', 'LIVREE'].includes(c.statut))) return 'EXPEDIEE'
  const maxIndex = Math.max(
    ...actives.map(c => STATUT_ORDER.indexOf(c.statut)).filter(i => i >= 0)
  )
  return STATUT_ORDER[maxIndex] ?? 'EN_ATTENTE'
}

function getVendeurNom(order: Order): string {
  return order.items[0]?.product?.vendeur?.nomBoutique ?? 'Caba Store'
}

function groupOrdersByGroupe(orders: Order[]): CommandeGroupe[] {
  const map = new Map<string, CommandeGroupe>()
  for (const order of orders) {
    const key = order.groupeId ?? order.id
    if (!map.has(key)) {
      map.set(key, {
        groupeId: key,
        createdAt: order.createdAt,
        adresse: order.adresse,
        modePaiement: order.modePaiement,
        commandes: [],
        statutGroupe: '',
        total: 0,
      })
    }
    const g = map.get(key)!
    g.commandes.push(order)
    g.total += order.total
  }
  return [...map.values()].map(g => ({
    ...g,
    statutGroupe: computeStatutGroupe(g.commandes),
    createdAt: g.commandes.reduce(
      (min, c) => c.createdAt < min ? c.createdAt : min,
      g.commandes[0].createdAt
    ),
  }))
}

// ─── StatutBadge ──────────────────────────────────────────────────────────────

function StatutBadge({ statut, size = 'sm' }: { statut: string; size?: 'xs' | 'sm' }) {
  const cfg = statutConfig[statut] ?? statutConfig.EN_ATTENTE
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full ${cfg.bg} ${cfg.color} ${
      size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
    }`}>
      <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {cfg.label}
    </span>
  )
}

// ─── Suivi linéaire (commande mono-vendeur) ───────────────────────────────────

function ProgressStepper({ statut }: { statut: string }) {
  const currentIndex = STATUT_ORDER.indexOf(statut)
  return (
    <div className="flex items-center gap-1">
      {STATUT_ORDER.map((s, i) => {
        const cfg   = statutConfig[s]
        const Icon  = cfg.icon
        const done  = statut !== 'ANNULEE' && i <= currentIndex
        const active = i === currentIndex && statut !== 'ANNULEE'
        return (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                done
                  ? active
                    ? 'bg-orange-700 text-white ring-2 ring-orange-200 dark:ring-orange-900'
                    : 'bg-orange-200 dark:bg-orange-900 text-orange-700 dark:text-orange-400'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className={`text-[9px] mt-1 text-center hidden sm:block leading-tight ${
                done ? (active ? 'text-orange-700 dark:text-orange-400 font-semibold' : 'text-orange-400 dark:text-orange-700') : 'text-stone-300 dark:text-stone-600'
              }`}>{cfg.label}</p>
            </div>
            {i < STATUT_ORDER.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 rounded-full ${
                i < currentIndex && statut !== 'ANNULEE' ? 'bg-orange-400 dark:bg-orange-700' : 'bg-stone-100 dark:bg-stone-800'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Mini barre de progression (vendeur dans groupe) ─────────────────────────

// ─── Mini stepper avec icônes (vendeur dans groupe) ───────────────────────────

function MiniProgress({ statut }: { statut: string }) {
  const currentIndex = STATUT_ORDER.indexOf(statut)
  return (
    <div className="flex items-center gap-1 my-2">
      {STATUT_ORDER.map((s, i) => {
        const cfg    = statutConfig[s]
        const Icon   = cfg.icon
        const done   = statut !== 'ANNULEE' && i <= currentIndex
        const active = i === currentIndex && statut !== 'ANNULEE'
        return (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                done
                  ? active
                    ? 'bg-orange-700 text-white ring-2 ring-orange-200 dark:ring-orange-900'
                    : 'bg-orange-200 dark:bg-orange-900 text-orange-700 dark:text-orange-400'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
              }`}>
                <Icon className="w-2.5 h-2.5" />
              </div>
            </div>
            {i < STATUT_ORDER.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 rounded-full ${
                i < currentIndex && statut !== 'ANNULEE'
                  ? 'bg-orange-400 dark:bg-orange-700'
                  : 'bg-stone-100 dark:bg-stone-800'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Section vendeur (items + livraison) ─────────────────────────────────────

function VendeurSection({ cmd, showHeader }: { cmd: Order; showHeader: boolean }) {
  const nom = getVendeurNom(cmd)
  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{nom}</p>
              <p className="text-[10px] text-stone-400">#{cmd.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>
          <StatutBadge statut={cmd.statut} size="xs" />
        </div>
      )}

      <MiniProgress statut={cmd.statut} />

      <div className="space-y-2 mt-2">
        {cmd.items.map(item => (
          <div key={item.id} className="flex items-start gap-2.5">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0">
              {item.product.images?.[0]
                ? <Image src={item.product.images[0]} alt={item.product.nom} fill sizes="40px" className="object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-stone-400" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-700 dark:text-stone-300 line-clamp-2">{item.product.nom}</p>
              <p className="text-[10px] text-stone-400">×{item.quantite} — {item.prix.toFixed(2)} DA/u</p>
            </div>
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 shrink-0 tabular-nums">
              {(item.prix * item.quantite).toFixed(2)} DA
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-stone-100 dark:border-stone-800 text-[10px] text-stone-400">
        <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {cmd.methodeExpedition}</span>
        <span>{(cmd.fraisLivraison ?? 700).toFixed(0)} DA livraison</span>
        <span className="font-semibold text-stone-600 dark:text-stone-300 tabular-nums">{cmd.total.toFixed(2)} DA</span>
      </div>
    </div>
  )
}

// ─── Bureau de livraison ──────────────────────────────────────────────────────

function BureauPanel({ groupe }: { groupe: CommandeGroupe }) {
  const actives      = groupe.commandes.filter(c => c.statut !== 'ANNULEE')
  const atBureau     = actives.filter(c => ['EXPEDIEE', 'LIVREE'].includes(c.statut))
  const allAtBureau  = atBureau.length === actives.length && actives.length > 0
  const allDelivered = actives.every(c => c.statut === 'LIVREE') && actives.length > 0

  const panelCls = allDelivered
    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
    : allAtBureau
    ? 'bg-blue-50  dark:bg-blue-950/30  border-blue-200  dark:border-blue-800'
    : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700'

  const titleCls = allDelivered
    ? 'text-green-700 dark:text-green-400'
    : allAtBureau
    ? 'text-blue-700 dark:text-blue-400'
    : 'text-stone-500 dark:text-stone-400'

  const bureauMsg = allDelivered
    ? `✅ Tous les colis ont été livrés`
    : allAtBureau
    ? `📦 ${atBureau.length} colis regroupés — livraison imminente`
    : atBureau.length > 0
    ? `🏢 ${atBureau.length} / ${actives.length} colis au bureau`
    : `⏳ En attente des colis vendeurs`

  return (
    <div className={`rounded-2xl border p-4 ${panelCls}`}>
      {/* Titre */}
      <div className="flex items-center gap-2 mb-3">
        <Building2 className={`w-4 h-4 ${titleCls}`} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          Bureau de livraison
        </p>
      </div>

      {/* Flux vendeurs → bureau */}
      <div className="space-y-2 mb-3">
        {actives.map(cmd => {
          const nom         = getVendeurNom(cmd)
          const isAtBureau  = ['EXPEDIEE', 'LIVREE'].includes(cmd.statut)
          const cfg         = statutConfig[cmd.statut] ?? statutConfig.EN_ATTENTE
          const Icon        = cfg.icon
          return (
            <div key={cmd.id} className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                isAtBureau ? 'bg-blue-500' : 'bg-stone-300 dark:bg-stone-600'
              }`} />
              <span className="text-stone-600 dark:text-stone-300 font-medium truncate" style={{ maxWidth: 130 }}>
                {nom}
              </span>
              <div className="flex-1 border-t border-dashed border-stone-200 dark:border-stone-700 mx-1" />
              <span className={`text-[10px] font-semibold whitespace-nowrap flex items-center gap-0.5 ${cfg.color}`}>
                <Icon className="w-2.5 h-2.5" />
                {isAtBureau ? 'Colis reçu' : cfg.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Statut global bureau */}
      <div className="border-t border-stone-200 dark:border-stone-700 pt-3">
        <div className="flex items-center gap-2">
          <Building2 className={`w-3.5 h-3.5 ${allAtBureau ? 'text-blue-600 dark:text-blue-400' : 'text-stone-400'}`} />
          <span className={`text-xs font-semibold ${allAtBureau ? 'text-blue-700 dark:text-blue-400' : 'text-stone-500 dark:text-stone-400'}`}>
            {bureauMsg}
          </span>
        </div>
        {!allAtBureau && (
          <p className="text-[10px] text-stone-400 mt-1 ml-5">
            En attente de {actives.length - atBureau.length} colis avant expédition groupée
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Carte de groupe ──────────────────────────────────────────────────────────

function GroupeCard({ groupe }: { groupe: CommandeGroupe }) {
  const [expanded, setExpanded] = useState(false)
  const isMulti       = groupe.commandes.length > 1
  const retourDemande = groupe.commandes.some(c => c.retourDemande)
  const estLivre      = groupe.statutGroupe === 'LIVREE'
  const singleOrder   = groupe.commandes[0]

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">

      {/* En-tête */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 rounded-xl flex items-center justify-center shrink-0">
            {isMulti
              ? <Store   className="w-4 h-4 text-orange-700 dark:text-orange-400" />
              : <Package className="w-4 h-4 text-orange-700 dark:text-orange-400" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {new Date(groupe.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              {isMulti && (
                <span className="ml-2 font-bold text-orange-700 dark:text-orange-400">
                  {groupe.commandes.length} vendeurs
                </span>
              )}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{groupe.adresse}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatutBadge statut={groupe.statutGroupe} />
          <p className="font-bold text-base text-orange-700 dark:text-orange-400 tabular-nums hidden sm:block">
            {groupe.total.toFixed(2)} DA
          </p>
          {expanded
            ? <ChevronUp   className="w-4 h-4 text-stone-400" />
            : <ChevronDown className="w-4 h-4 text-stone-400" />
          }
        </div>
      </div>

      {/* Corps dépliable */}
      {expanded && (
        <div className="border-t border-stone-100 dark:border-stone-800 px-5 py-4 space-y-5">

          {/* Résumé adresse + paiement */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-3">
              <p className="text-stone-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Adresse</p>
              <p className="font-medium text-stone-700 dark:text-stone-300 text-[11px] leading-snug">{groupe.adresse}</p>
            </div>
            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-3">
              <p className="text-stone-400 mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Paiement</p>
              <p className="font-medium text-stone-700 dark:text-stone-300 text-[11px]">{groupe.modePaiement}</p>
            </div>
          </div>

          {/* ── Mono-vendeur : stepper classique + section vendeur ── */}
          {!isMulti && (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Suivi de commande
                </p>
                <ProgressStepper statut={singleOrder.statut} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3 flex items-center gap-1">
                  <Package className="w-3 h-3" /> Articles
                </p>
                <VendeurSection cmd={singleOrder} showHeader={false} />
              </div>
            </>
          )}

          {/* ── Multi-vendeur : sections par vendeur + bureau ── */}
          {isMulti && (
            <>
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 flex items-center gap-1">
                  <Store className="w-3 h-3" /> Commandes par vendeur
                </p>
                {groupe.commandes.map((cmd, idx) => (
                  <div key={cmd.id}>
                    {idx > 0 && <div className="border-t border-dashed border-stone-100 dark:border-stone-800 pt-4" />}
                    <VendeurSection cmd={cmd} showHeader />
                  </div>
                ))}
              </div>

              {/* Panel bureau de livraison */}
              <BureauPanel groupe={groupe} />
            </>
          )}

          {/* Pied : retour + total */}
          <div className="border-t border-stone-100 dark:border-stone-800 pt-3 flex items-center justify-between">
            <div>
              {estLivre && (
                retourDemande ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-400 cursor-default">
                    <Check className="w-3 h-3" /> Retour déjà demandé
                  </span>
                ) : (
                  <Link
                    href="/mes-retours"
                    className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition"
                  >
                    ↩ Réclamer un retour
                  </Link>
                )
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-stone-400 mb-0.5">Total{isMulti ? ' général' : ''}</p>
              <p className="font-bold text-lg text-orange-700 dark:text-orange-400 tabular-nums">
                {groupe.total.toFixed(2)} DA
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Contenu principal ────────────────────────────────────────────────────────

function CommandesContent() {
  const searchParams = useSearchParams()
  const success      = searchParams.get('success')
  const [commandes, setCommandes] = useState<Order[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/commandes/')
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<Order[]> })
      .then(data => setCommandes(data))
      .catch(() => setError('Impossible de charger vos commandes. Veuillez réessayer.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="w-8 h-8 border-2 border-stone-200 border-t-orange-700 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-stone-500 dark:text-stone-400">Chargement des commandes…</p>
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
    </div>
  )

  const groupes = groupOrdersByGroupe(commandes)

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-20 md:pb-12">

      {success && (
        <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-6 py-4 rounded-2xl mb-6 flex items-center gap-3">
          <PartyPopper className="w-8 h-8 shrink-0" />
          <div>
            <p className="font-semibold">Commande passée avec succès !</p>
            <p className="text-sm opacity-80">Vous pouvez suivre votre commande ci-dessous.</p>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1">Espace client</p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">Mes commandes</h1>
        </div>
        <Link
          href="/commandes/nouveau"
          className="hidden sm:inline-flex items-center gap-1.5 bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          + Nouvelle commande
        </Link>
      </div>

      {groupes.length === 0 ? (
        <div className="flex flex-col items-center text-center py-24 gap-4">
          <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-3xl flex items-center justify-center">
            <Package className="w-10 h-10 text-stone-300 dark:text-stone-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-1">Aucune commande</h2>
            <p className="text-stone-400 dark:text-stone-500 text-sm mb-6">Vous n&apos;avez pas encore passé de commande.</p>
          </div>
          <Link href="/produits" className="bg-orange-700 hover:bg-orange-800 text-white font-semibold px-8 py-3 rounded-xl transition">
            Voir les produits
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {groupes.map(groupe => (
            <GroupeCard key={groupe.groupeId} groupe={groupe} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ClientCommandesView() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-orange-700 rounded-full animate-spin mx-auto" />
      </div>
    }>
      <CommandesContent />
    </Suspense>
  )
}
