'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import PusherJS from 'pusher-js'
import { CheckCircle2, Eye, Loader2, MapPin, Package, RefreshCw, ShoppingCart, Store,
   TrendingDown, Truck, User, Wrench, X, XCircle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────

type PrixTier = { minQte: number; maxQte: number | null; prix: number }

type OrderItem = {
  id:        string
  quantite:  number
  prix:      number
  variantNom?: string | null
  variantOptionValeur?: string | null
  variant?: {
    id:      string
    nom:     string
    couleur: string | null
    images:  string[]
  } | null
  product: {
    nom:          string
    images:       string[]
    prix:         number
    prixVariables: PrixTier[] | null
    vendeur?: { id: string; nomBoutique: string | null } | null
  }
}

type Order = {
  id:        string
  statut:    string
  total:     number
  adresse:   string
  createdAt: string
  user: { nom: string; prenom: string; email: string | null; telephone: string | null }
  items: OrderItem[]
}

type VendeurOption = {
  id:          string
  nomBoutique: string | null
  user:        { nom: string; prenom: string }
}

// ── Config statuts ─────────────────────────────────────────────────────────

const statutConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  EN_ATTENTE:     { label: 'En attente',     color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400', icon: Loader2 },
  CONFIRMEE:      { label: 'Confirmée',      color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',         icon: CheckCircle2 },
  EN_PREPARATION: { label: 'En préparation', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400', icon: Wrench },
  EXPEDIEE:       { label: 'Expédiée',       color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400', icon: Truck },
  LIVREE:         { label: 'Livrée',         color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',     icon: Package },
  ANNULEE:        { label: 'Annulée',        color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',             icon: XCircle },
}

const ordreStatuts   = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE']
const tousLesStatuts = Object.keys(statutConfig)

/** Économies totales d'une commande grâce aux prix dégressifs */
function getEconomieCommande(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    const diff = item.product.prix - item.prix
    return sum + (diff > 0 ? diff * item.quantite : 0)
  }, 0)
}

// ── Composant principal ────────────────────────────────────────────────────

export default function AdminCommandesPage() {
  const [commandes,        setCommandes]        = useState<Order[]>([])
  const [loading,          setLoading]          = useState(true)
  const [filterStatut,     setFilterStatut]     = useState('TOUS')
  const [filterVendeur,    setFilterVendeur]    = useState('')
  const [filterCategory,   setFilterCategory]   = useState('')
  const [categories,       setCategories]       = useState<{id:string;nom:string}[]>([])
  const [vendeurs,         setVendeurs]         = useState<VendeurOption[]>([])
  const [search,           setSearch]           = useState('')
  const [selectedCommande, setSelectedCommande] = useState<Order | null>(null)
  const [updatingId,       setUpdatingId]       = useState<string | null>(null)
  const [toast,            setToast]            = useState<React.ReactNode | null>(null)
  const [adminOnly,        setAdminOnly]        = useState(false)

  const showToast = (msg: React.ReactNode) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // ── Chargement ──────────────────────────────────────────────────────────

  const fetchVendeurs = useCallback(async () => {
    const res = await fetch('/api/admin/vendeurs?statut=APPROUVE')
    if (res.ok) setVendeurs(await res.json())
  }, [])

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/admin/categories')
    if (res.ok) setCategories(await res.json())
  }, [])

  const fetchCommandes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatut !== 'TOUS') params.set('statut',     filterStatut)
    if (filterVendeur)           params.set('vendeurId',  filterVendeur)
    if (adminOnly)               params.set('adminOnly',  'true')
    if (filterCategory)          params.set('categoryId', filterCategory)
    if (search)                  params.set('search',     search)

    const res = await fetch(`/api/admin/commandes?${params}`)
    if (res.ok) setCommandes(await res.json())
    setLoading(false)
  }, [filterStatut, filterVendeur, filterCategory, adminOnly, search])

  useEffect(() => {
    void (async () => {
      await Promise.all([fetchVendeurs(), fetchCategories()])
    })()
  }, [fetchVendeurs, fetchCategories])

  useEffect(() => {
    void (async () => { await fetchCommandes() })()
  }, [fetchCommandes])

  // ── Pusher — temps réel ─────────────────────────────────────────────────

  useEffect(() => {
    const pusher  = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe('admin-commandes')

    channel.bind('statut-change', (data: { commandeId: string; statut: string; client: string; message: string }) => {
      setCommandes(prev =>
        prev.map(c => c.id === data.commandeId ? { ...c, statut: data.statut } : c)
      )
      showToast(<><Package className="w-4 h-4 inline mr-1" />{' '}{`${data.client} — ${data.message}`}</>)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('admin-commandes')
      pusher.disconnect()
    }
  }, [])

  // ── Changement de statut ────────────────────────────────────────────────

  const handleStatutChange = async (id: string, statut: string) => {
    setUpdatingId(id)
    const res = await fetch(`/api/admin/commandes/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ statut }),
    })
    if (res.ok) {
      setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut } : c))
      if (selectedCommande?.id === id) {
        setSelectedCommande(prev => prev ? { ...prev, statut } : null)
      }
    }
    setUpdatingId(null)
  }

  // Prochain statut possible (linéaire, sans blocage scan)
  const getStatutSuivant = (statut: string) => {
    const idx = ordreStatuts.indexOf(statut)
    if (idx === -1 || idx >= ordreStatuts.length - 1) return null
    return ordreStatuts[idx + 1]
  }

  // ── Filtrage local (recherche) ──────────────────────────────────────────

  const filtered = commandes.filter(c => {
    if (!search) return true
    return `${c.user.nom} ${c.user.prenom} ${c.user.email ?? ''} ${c.id}`
      .toLowerCase()
      .includes(search.toLowerCase())
  })

  // ── Rendu ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-12">Chargement...</div>
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3">
          <p className="text-sm font-medium">{toast}</p>
          <button onClick={() => setToast(null)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Commandes ({commandes.length})
        </h1>
      </div>

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-6">

        {/* Ligne 1 : recherche + vendeur + catégorie */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchCommandes()}
            placeholder="Rechercher par client ou ID..."
            className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={filterVendeur}
            onChange={e => { setFilterVendeur(e.target.value); setAdminOnly(false) }}
            disabled={adminOnly}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-50"
          >
            <option value="">Tous les vendeurs</option>
            {vendeurs.map(v => (
              <option key={v.id} value={v.id}>
                {v.nomBoutique || `${v.user.prenom} ${v.user.nom}`}
              </option>
            ))}
          </select>
          {/* Filtre catégorie */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-45"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          {/* Filtre admin uniquement */}
          <button
            onClick={() => { setAdminOnly(v => !v); setFilterVendeur('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap border ${{
              true: 'bg-blue-600 text-white border-blue-600',
              false: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
            }[String(adminOnly)]}`}
          ><ShoppingCart className="w-4 h-4 inline mr-1" />{' '}Admin seulement
          </button>
        </div>

        {/* Ligne 2 : filtres statut */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatut('TOUS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterStatut === 'TOUS'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Tous
          </button>
          {tousLesStatuts.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatut(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterStatut === s
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {(() => { const Icon = statutConfig[s].icon; return <Icon className="w-3 h-3 inline mr-1" /> })()} {statutConfig[s].label}
            </button>
          ))}
        </div>

        {/* Badges filtres actifs */}
        {(filterVendeur || filterStatut !== 'TOUS' || filterCategory) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 dark:text-gray-500">Filtres :</span>
            {filterVendeur && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                🏪 {vendeurs.find(v => v.id === filterVendeur)?.nomBoutique || 'Vendeur'}
                <button onClick={() => setFilterVendeur('')} className="ml-0.5 hover:text-emerald-500 font-bold">×</button>
              </span>
            )}
            {filterCategory && (
              <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                🏷️ {categories.find(c => c.id === filterCategory)?.nom || 'Catégorie'}
                <button onClick={() => setFilterCategory('')} className="ml-0.5 hover:text-blue-500 font-bold">×</button>
              </span>
            )}
            {filterStatut !== 'TOUS' && (
              <span className="text-xs bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                {(() => { const Icon = statutConfig[filterStatut]?.icon; return Icon ? <Icon className="w-3 h-3 inline mr-1" /> : null })()} {statutConfig[filterStatut]?.label}
                <button onClick={() => setFilterStatut('TOUS')} className="ml-0.5 hover:text-purple-500 font-bold">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── MOBILE : cartes empilées ─────────────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Aucune commande trouvée</p>
        ) : filtered.map(commande => {
          const statut  = statutConfig[commande.statut]
          const suivant = getStatutSuivant(commande.statut)
          const vendeursCommande = commande.items
            .map(i => i.product.vendeur).filter(Boolean)
            .filter((v, idx, arr) => arr.findIndex(x => x?.id === v?.id) === idx)
          return (
            <div key={commande.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
              {/* Ligne principale */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-gray-400">#{commande.id.slice(-8).toUpperCase()}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-0.5">
                    {commande.user.prenom} {commande.user.nom}
                  </p>
                  <p className="text-xs text-gray-400">{commande.user.email || commande.user.telephone}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${statut.color}`}>
                    {(() => { const Icon = statut.icon; return <Icon className="w-3 h-3 inline mr-1" /> })()} {statut.label}
                  </span>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {commande.total.toFixed(2)} DA
                  </p>
                </div>
              </div>
              {/* Vendeurs + date */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3 text-xs">
                {vendeursCommande.length === 0
                  ? <span className="text-gray-400"><ShoppingCart className="w-4 h-4 inline mr-1" />{' '}Admin</span>
                  : vendeursCommande.map(v => (
                    <span key={v!.id} className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full"><Store className="w-4 h-4 inline mr-1" />{' '}{v!.nomBoutique || '—'}
                    </span>
                  ))
                }
                <span className="text-gray-400 ml-auto">
                  {new Date(commande.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              {/* Actions */}
              <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setSelectedCommande(commande)}
                  className="flex-1 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 px-3 py-2 rounded-lg text-xs font-medium transition"
                ><Eye className="w-4 h-4 inline mr-1" />{' '}Détails
                </button>
                {suivant && (
                  <button
                    onClick={() => handleStatutChange(commande.id, suivant)}
                    disabled={updatingId === commande.id}
                    className="flex-1 bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 px-3 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50"
                  >
                    {updatingId === commande.id ? '...' : statutConfig[suivant].label}
                  </button>
                )}
                {!['LIVREE', 'ANNULEE'].includes(commande.statut) && (
                  <button
                    onClick={() => handleStatutChange(commande.id, 'ANNULEE')}
                    disabled={updatingId === commande.id}
                    className="bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400 px-3 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50"
                  ><XCircle className="w-5 h-5" /></button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── DESKTOP : tableau ────────────────────────────────────────────── */}
      <div className="hidden lg:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-200">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
              <tr>
                <th className="text-left px-4 py-4">Commande</th>
                <th className="text-left px-4 py-4">Client</th>
                <th className="text-left px-4 py-4">Vendeur(s)</th>
                <th className="text-left px-4 py-4">Total</th>
                <th className="text-left px-4 py-4">Statut</th>
                <th className="text-left px-4 py-4">Date</th>
                <th className="text-left px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                filtered.map(commande => {
                  const statut  = statutConfig[commande.statut]
                  const suivant = getStatutSuivant(commande.statut)
                  const vendeursCommande = commande.items
                    .map(i => i.product.vendeur).filter(Boolean)
                    .filter((v, idx, arr) => arr.findIndex(x => x?.id === v?.id) === idx)
                  return (
                    <tr key={commande.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-4 py-4">
                        <p className="font-mono font-semibold text-gray-800 dark:text-gray-100 text-xs">
                          #{commande.id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{commande.items.length} article(s)</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800 dark:text-gray-100">
                          {commande.user.prenom} {commande.user.nom}
                        </p>
                        <p className="text-xs text-gray-400">{commande.user.email || commande.user.telephone}</p>
                      </td>
                      <td className="px-4 py-4">
                        {vendeursCommande.length === 0 ? (
                          <span className="text-xs text-gray-400">Admin</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {vendeursCommande.map(v => (
                              <span key={v!.id} className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full truncate max-w-32.5"><Store className="w-4 h-4 inline mr-1" />{' '}{v!.nomBoutique || '—'}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-blue-600 dark:text-blue-400">
                          {commande.total.toFixed(2)} DA
                        </p>
                        {(() => {
                          const eco = getEconomieCommande(commande.items)
                          return eco > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 font-semibold px-1.5 py-0.5 rounded-full mt-0.5">
                              <TrendingDown className="w-2.5 h-2.5" />−{eco.toFixed(2)} DA
                            </span>
                          ) : null
                        })()}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statut.color}`}>
                          {(() => { const Icon = statut.icon; return <Icon className="w-3 h-3 inline mr-1" /> })()} {statut.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(commande.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => setSelectedCommande(commande)} className="bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900 px-3 py-1.5 rounded-lg text-xs font-medium transition"><Eye className="w-4 h-4 inline mr-1" />{' '}Voir
                          </button>
                          {suivant && (
                            <button onClick={() => handleStatutChange(commande.id, suivant)} disabled={updatingId === commande.id}
                              className="bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 whitespace-nowrap">
                              {updatingId === commande.id ? '...' : statutConfig[suivant].label}
                            </button>
                          )}
                          {!['LIVREE', 'ANNULEE'].includes(commande.statut) && (
                            <button onClick={() => handleStatutChange(commande.id, 'ANNULEE')} disabled={updatingId === commande.id}
                              className="bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"><XCircle className="w-4 h-4 inline mr-1" />{' '}Annuler
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal détails commande ────────────────────────────────────────── */}
      {selectedCommande && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedCommande(null) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-800">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  #{selectedCommande.id.slice(-8).toUpperCase()}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(selectedCommande.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statutConfig[selectedCommande.statut].color}`}>
                {(() => { const Icon = statutConfig[selectedCommande.statut].icon; return <Icon className="w-3 h-3 inline mr-1" /> })()} {statutConfig[selectedCommande.statut].label}
              </span>
            </div>

            {/* Client */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1"><User className="w-4 h-4 inline mr-1" />{' '}Client</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {selectedCommande.user.prenom} {selectedCommande.user.nom}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedCommande.user.email || selectedCommande.user.telephone}
              </p>
            </div>

            {/* Adresse */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1"><MapPin className="w-4 h-4 inline mr-1" />{' '}Adresse</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{selectedCommande.adresse}</p>
            </div>

            {/* Articles */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-3"><Package className="w-4 h-4 inline mr-1" />{' '}Articles</p>
              <div className="space-y-3">
                {selectedCommande.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0 relative">
                      {(() => {
                        const img = item.variant?.images?.[0] || item.product.images[0]
                        return img
                          ? <Image src={img} alt={item.product.nom} fill sizes="48px" className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-lg"><Package className="w-5 h-5" /></div>
                      })()}
                      {item.variant?.couleur && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-700"
                          style={{ backgroundColor: item.variant.couleur }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.product.nom}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {item.variant && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            {item.variant.couleur && (
                              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.variant.couleur }} />
                            )}
                            {item.variant.nom}
                          </span>
                        )}
                        {item.variantOptionValeur && (
                          <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                            {item.variantOptionValeur}
                          </span>
                        )}
                        {(() => {
                          const prixBase  = item.product.prix
                          const estReduit = item.prix < prixBase && item.prix > 0
                          const pct       = estReduit ? Math.round((1 - item.prix / prixBase) * 100) : 0
                          return (
                            <span className="flex items-center gap-1 flex-wrap">
                              <span className={`text-xs font-semibold ${estReduit ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                ×{item.quantite} — {item.prix.toFixed(2)} DA/u.
                              </span>
                              {estReduit && (
                                <>
                                  <span className="text-[10px] text-gray-400 line-through">{prixBase.toFixed(2)} DA</span>
                                  <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 font-bold px-1.5 py-0.5 rounded-full">
                                    <TrendingDown className="w-2.5 h-2.5" />−{pct}%
                                  </span>
                                </>
                              )}
                            </span>
                          )
                        })()}
                        {item.product.vendeur && (
                          <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full"><Store className="w-4 h-4 inline mr-1" />{' '}{item.product.vendeur.nomBoutique || '—'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {(() => {
                        const prixBase  = item.product.prix
                        const estReduit = item.prix < prixBase && item.prix > 0
                        return (
                          <>
                            <p className={`font-semibold text-sm ${estReduit ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-100'}`}>
                              {(item.prix * item.quantite).toFixed(2)} DA
                            </p>
                            {estReduit && (
                              <p className="text-[10px] text-gray-400 line-through">{(prixBase * item.quantite).toFixed(2)} DA</p>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Économies + Total */}
            {(() => {
              const totalEco = getEconomieCommande(selectedCommande.items)
              return (
                <div className="space-y-2 mb-6 px-1">
                  {totalEco > 0 && (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/50 border border-green-100 dark:border-green-900 rounded-xl px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400 font-medium">
                        <TrendingDown className="w-4 h-4" /> Économies dégressives
                      </span>
                      <span className="text-sm font-bold text-green-700 dark:text-green-400">
                        −{totalEco.toFixed(2)} DA
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-gray-800 dark:text-gray-100">Total commande</span>
                    <span className="text-blue-600 dark:text-blue-400">{selectedCommande.total.toFixed(2)} DA</span>
                  </div>
                </div>
              )
            })()}

            {/* Changer statut */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"><RefreshCw className="w-4 h-4 inline mr-1" />{' '}Changer le statut</p>
              <div className="grid grid-cols-2 gap-2">
                {tousLesStatuts.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatutChange(selectedCommande.id, s)}
                    disabled={selectedCommande.statut === s || updatingId === selectedCommande.id}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                      selectedCommande.statut === s
                        ? `${statutConfig[s].color} cursor-default`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50'
                    }`}
                  >
                    {(() => { const Icon = statutConfig[s].icon; return <Icon className="w-3 h-3 inline mr-1" /> })()} {statutConfig[s].label}
                    {selectedCommande.statut === s && ' ✓'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedCommande(null)}
              className="w-full border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}