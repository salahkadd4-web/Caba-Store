'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  ShoppingCart, Search, ChevronDown, ChevronUp,
  CheckCircle2, Truck, PackageCheck, Clock, XCircle, RotateCcw,
  Package, ChevronRight, Loader2, MoreVertical,
} from 'lucide-react'
import {
  heading, card, tableWrapper, tableHead, tableTh, tableTd, tableRow,
  btnPrimaryEmerald, btnSecondary, selectCls, inputCls, loadingPage,
  statutOrderColor,
} from '@/lib/dashboard-ui'

type OrderItem = {
  id: string
  quantite: number
  prix: number
  product: { id: string; nom: string; images: string[]; prix: number; prixVariables: unknown }
  variant: { id: string; nom: string; couleur: string | null; images: string[] } | null
}

export type Commande = {
  id: string
  createdAt: Date | string
  statut: string
  total: number
  adresseLivraison?: string | null
  user?: { nom: string | null; prenom: string | null; email: string | null; telephone?: string | null } | null
  items: OrderItem[]
  totalVendeur?: number
  approbationsVendeurs?: Record<string, boolean> | null
}

const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE:     'En attente',
  CONFIRMEE:      'Confirmée',
  EN_PREPARATION: 'En préparation',
  EXPEDIEE:       'Expédiée',
  LIVREE:         'Livrée',
  ANNULEE:        'Annulée',
  RETOURNEE:      'Retournée',
}

const STATUT_ICON: Record<string, React.ElementType> = {
  EN_ATTENTE:     Clock,
  CONFIRMEE:      CheckCircle2,
  EN_PREPARATION: Package,
  EXPEDIEE:       Truck,
  LIVREE:         PackageCheck,
  ANNULEE:        XCircle,
  RETOURNEE:      RotateCcw,
}

// Actions rapides (avancement linéaire) — vendeur
const NEXT_ACTION_VENDEUR: Record<string, { label: string; statut?: string; approuver?: boolean; color: string }> = {
  EN_ATTENTE:     { label: 'Approuver',         approuver: true,             color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  CONFIRMEE:      { label: 'Mettre en prépa.',  statut: 'EN_PREPARATION',    color: 'bg-orange-600 hover:bg-orange-700 text-white' },
  EN_PREPARATION: { label: 'Marquer expédiée',  statut: 'EXPEDIEE',          color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  EXPEDIEE:       { label: 'Marquer livrée',    statut: 'LIVREE',            color: 'bg-green-600 hover:bg-green-700 text-white' },
}

// Actions admin : changement direct de statut + annulation
const ADMIN_ACTIONS: Record<string, { label: string; statut: string; color: string }[]> = {
  EN_ATTENTE:     [
    { label: '✓ Confirmer',         statut: 'CONFIRMEE',      color: 'text-emerald-600 dark:text-emerald-400' },
    { label: '✕ Annuler',           statut: 'ANNULEE',        color: 'text-red-600 dark:text-red-400' },
  ],
  CONFIRMEE:      [
    { label: '📦 Mettre en prépa.', statut: 'EN_PREPARATION', color: 'text-orange-600 dark:text-orange-400' },
    { label: '✕ Annuler',           statut: 'ANNULEE',        color: 'text-red-600 dark:text-red-400' },
  ],
  EN_PREPARATION: [
    { label: '🚚 Marquer expédiée', statut: 'EXPEDIEE',       color: 'text-indigo-600 dark:text-indigo-400' },
    { label: '✕ Annuler',           statut: 'ANNULEE',        color: 'text-red-600 dark:text-red-400' },
  ],
  EXPEDIEE:       [
    { label: '✓ Marquer livrée',    statut: 'LIVREE',         color: 'text-green-600 dark:text-green-400' },
    { label: '↩ Retourner',         statut: 'RETOURNEE',      color: 'text-amber-600 dark:text-amber-400' },
  ],
  LIVREE:         [
    { label: '↩ Retourner',         statut: 'RETOURNEE',      color: 'text-amber-600 dark:text-amber-400' },
  ],
  ANNULEE:        [
    { label: '↺ Remettre en attente', statut: 'EN_ATTENTE',  color: 'text-blue-600 dark:text-blue-400' },
  ],
  RETOURNEE:      [
    { label: '↺ Remettre en attente', statut: 'EN_ATTENTE',  color: 'text-blue-600 dark:text-blue-400' },
  ],
}

const STATUTS_FILTRE = ['', 'EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'ANNULEE']

// ── Dropdown menu admin ────────────────────────────────────────────────────────
function AdminActionsMenu({
  cmd,
  onAction,
  loading,
}: {
  cmd: Commande
  onAction: (statut: string) => void
  loading: boolean
}) {
  const actions = ADMIN_ACTIONS[cmd.statut] ?? []
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (actions.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50
          bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 whitespace-nowrap"
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <MoreVertical className="w-3.5 h-3.5" />
        }
        Actions
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-44 rounded-xl border border-stone-200 dark:border-stone-700
            bg-white dark:bg-stone-900 shadow-lg py-1 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {actions.map(a => (
            <button
              key={a.statut}
              onClick={() => { setOpen(false); onAction(a.statut) }}
              className={`w-full text-left text-sm px-4 py-2.5 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors ${a.color}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardCommandesView({
  commandes: initial,
  isAdmin,
}: {
  commandes: Commande[]
  isAdmin: boolean
}) {
  const [commandes, setCommandes] = useState<Commande[]>(initial)
  const [search,    setSearch]    = useState('')
  const [filtre,    setFiltre]    = useState('')
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [loading,   setLoading]   = useState<string | null>(null)
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const filtered = commandes.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || [
      c.id,
      c.user?.nom ?? '',
      c.user?.prenom ?? '',
      c.user?.email ?? '',
    ].some(v => v.toLowerCase().includes(q))
    const matchStatut = !filtre || c.statut === filtre
    return matchSearch && matchStatut
  })

  // Action vendeur (avancement linéaire)
  const handleVendeurAction = async (cmd: Commande) => {
    const action = NEXT_ACTION_VENDEUR[cmd.statut]
    if (!action) return
    setLoading(cmd.id)
    try {
      const body: Record<string, unknown> = {}
      if (action.approuver) body.approuver = true
      if (action.statut)    body.statut    = action.statut
      const res  = await fetch(`/api/vendeur/commandes/${cmd.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setCommandes(prev => prev.map(c => c.id === cmd.id ? { ...c, ...data } : c))
      showToast(data.message ?? 'Statut mis à jour', true)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setLoading(null)
    }
  }

  // Action admin (statut direct)
  const handleAdminAction = async (cmd: Commande, statut: string) => {
    setLoading(cmd.id)
    try {
      const res = await fetch(`/api/admin/commandes/${cmd.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setCommandes(prev => prev.map(c => c.id === cmd.id ? { ...c, statut } : c))
      showToast(`Commande mise à jour : ${STATUT_LABEL[statut] ?? statut}`, true)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-100 text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all ${
          toast.ok
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={heading}>Commandes</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {commandes.length} commande{commandes.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par référence, client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={filtre}
          onChange={e => setFiltre(e.target.value)}
          className={`${selectCls} text-sm py-2.5 min-w-40`}
        >
          <option value="">Tous les statuts</option>
          {STATUTS_FILTRE.filter(Boolean).map(s => (
            <option key={s} value={s}>{STATUT_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <div className={`${card} p-16 text-center`}>
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-stone-300 dark:text-stone-700" />
          <p className="text-stone-400 dark:text-stone-500 text-sm">Aucune commande trouvée.</p>
        </div>
      ) : (
        <div className={tableWrapper}>
          {/* Header tableau — desktop */}
          <div className={`hidden md:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1.5fr_auto] ${tableHead} border-b border-stone-100 dark:border-stone-800`}>
            <div className={tableTh}>Référence</div>
            <div className={tableTh}>Client</div>
            <div className={tableTh}>Date</div>
            <div className={tableTh}>Articles</div>
            <div className={tableTh}>Total</div>
            <div className={tableTh}>Statut</div>
            <div className={tableTh}>Action</div>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {filtered.map(cmd => {
              const StatusIcon = STATUT_ICON[cmd.statut] ?? Clock
              const vendeurAction = !isAdmin ? NEXT_ACTION_VENDEUR[cmd.statut] : null
              const isExp      = expanded === cmd.id
              const isLoading  = loading === cmd.id
              const montant    = cmd.totalVendeur ?? cmd.total

              return (
                <div key={cmd.id}>
                  {/* Ligne principale */}
                  <div
                    className={`${tableRow} cursor-pointer`}
                    onClick={() => setExpanded(isExp ? null : cmd.id)}
                  >
                    {/* Mobile layout */}
                    <div className="md:hidden px-4 py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-stone-600 dark:text-stone-300">
                            #{cmd.id.slice(-8).toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statutOrderColor[cmd.statut] ?? 'bg-stone-100 text-stone-600'}`}>
                            <StatusIcon className="w-3 h-3" />
                            {STATUT_LABEL[cmd.statut] ?? cmd.statut}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                          {cmd.user?.prenom} {cmd.user?.nom}
                        </p>
                        <p className="text-xs text-stone-400">
                          {new Date(cmd.createdAt).toLocaleDateString('fr-DZ')} · {cmd.items.length} article{cmd.items.length !== 1 ? 's' : ''} · <span className="font-semibold text-stone-700 dark:text-stone-200">{Number(montant).toLocaleString('fr-DZ')} DA</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {isAdmin ? (
                          <AdminActionsMenu
                            cmd={cmd}
                            onAction={(statut) => handleAdminAction(cmd, statut)}
                            loading={isLoading}
                          />
                        ) : vendeurAction && (
                          <button
                            onClick={e => { e.stopPropagation(); handleVendeurAction(cmd) }}
                            disabled={isLoading}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1 ${vendeurAction.color}`}
                          >
                            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                            {vendeurAction.label}
                          </button>
                        )}
                        {isExp ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1.5fr_auto] items-center">
                      <div className={tableTd}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-stone-600 dark:text-stone-300">
                            #{cmd.id.slice(-8).toUpperCase()}
                          </span>
                          {isExp
                            ? <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                            : <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                          }
                        </div>
                      </div>
                      <div className={tableTd}>
                        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                          {cmd.user?.prenom} {cmd.user?.nom}
                        </p>
                        {isAdmin && <p className="text-xs text-stone-400">{cmd.user?.email}</p>}
                      </div>
                      <div className={`${tableTd} text-stone-500 dark:text-stone-400 text-sm whitespace-nowrap`}>
                        {new Date(cmd.createdAt).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className={`${tableTd} text-stone-600 dark:text-stone-400 text-sm`}>
                        {cmd.items.length} article{cmd.items.length !== 1 ? 's' : ''}
                      </div>
                      <div className={`${tableTd} font-semibold text-stone-800 dark:text-stone-100 text-sm whitespace-nowrap`}>
                        {Number(montant).toLocaleString('fr-DZ')} DA
                      </div>
                      <div className={tableTd}>
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${statutOrderColor[cmd.statut] ?? 'bg-stone-100 text-stone-600'}`}>
                          <StatusIcon className="w-3 h-3" />
                          {STATUT_LABEL[cmd.statut] ?? cmd.statut}
                        </span>
                      </div>
                      <div className={tableTd}>
                        {isAdmin ? (
                          <AdminActionsMenu
                            cmd={cmd}
                            onAction={(statut) => handleAdminAction(cmd, statut)}
                            loading={isLoading}
                          />
                        ) : vendeurAction && (
                          <button
                            onClick={e => { e.stopPropagation(); handleVendeurAction(cmd) }}
                            disabled={isLoading}
                            className={`text-xs px-3 py-2 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap ${vendeurAction.color}`}
                          >
                            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                            {vendeurAction.label}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Détail expandé */}
                  {isExp && (
                    <div className="bg-stone-50 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800 px-5 py-4">
                      <div className="space-y-3">
                        {/* Infos client */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                          {cmd.user?.email && <span>✉ {cmd.user.email}</span>}
                          {cmd.user?.telephone && <span>☎ {cmd.user.telephone}</span>}
                          {cmd.adresseLivraison && <span>📍 {cmd.adresseLivraison}</span>}
                        </div>

                        {/* Articles */}
                        <div className="space-y-2">
                          {cmd.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-100 dark:border-stone-800">
                              {(item.variant?.images[0] ?? item.product.images[0]) ? (
                                <div className="relative w-10 h-10 shrink-0">
                                  <Image
                                    src={item.variant?.images[0] ?? item.product.images[0]}
                                    alt={item.product.nom}
                                    fill
                                    sizes="40px"
                                    className="object-cover rounded-lg"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 shrink-0 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
                                  <Package className="w-4 h-4 text-stone-400" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{item.product.nom}</p>
                                {item.variant && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {item.variant.couleur && (
                                      <span className="w-3 h-3 rounded-full border border-stone-200 inline-block" style={{ backgroundColor: item.variant.couleur }} />
                                    )}
                                    <span className="text-xs text-stone-400">{item.variant.nom}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                                  {Number(item.prix).toLocaleString('fr-DZ')} DA
                                </p>
                                <p className="text-xs text-stone-400">× {item.quantite}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Total + actions admin dans le détail (mobile) */}
                        <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-700">
                          <span className="text-xs text-stone-400">Total commande</span>
                          <span className="text-sm font-bold text-stone-800 dark:text-stone-100">
                            {Number(cmd.total).toLocaleString('fr-DZ')} DA
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}