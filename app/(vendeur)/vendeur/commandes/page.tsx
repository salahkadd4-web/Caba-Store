'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { CheckCircle2, Loader2, MapPin, Package, Phone, RefreshCw, Search, TrendingDown, Truck, User, Wrench, X, XCircle } from 'lucide-react'

interface OrderItem {
  id: string; quantite: number; prix: number
  variantOptionValeur?: string | null
  variant?: { id: string; nom: string; couleur: string | null; images: string[] } | null
  product: { id: string; nom: string; images: string[]; prix: number }
}
interface Order {
  id: string; statut: string; adresse: string
  createdAt: string; totalVendeur: number
  user: { id: string; nom: string; prenom: string; email: string | null; telephone: string | null }
  items: OrderItem[]
}

const STATUTS = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'ANNULEE']

const statutConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  EN_ATTENTE:     { label: 'En attente',     icon: Loader2,      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' },
  CONFIRMEE:      { label: 'Confirmée',      icon: CheckCircle2, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  EN_PREPARATION: { label: 'En préparation', icon: Wrench,       color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  EXPEDIEE:       { label: 'Expédiée',       icon: Truck,        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  LIVREE:         { label: 'Livrée',         icon: Package,      color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
  ANNULEE:        { label: 'Annulée',        icon: XCircle,      color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
}

const ORDRE_STATUTS = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE']

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function VendeurCommandesPage() {
  const [commandes,      setCommandes]      = useState<Order[]>([])
  const [loading,        setLoading]        = useState(true)
  const [searching,      setSearching]      = useState(false)
  const [statut,         setStatut]         = useState('')
  const [search,         setSearch]         = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [categories,     setCategories]     = useState<{ id: string; nom: string }[]>([])
  const [selected,       setSelected]       = useState<Order | null>(null)
  const [updatingId,     setUpdatingId]     = useState<string | null>(null)
  const [toast,          setToast]          = useState<React.ReactNode | null>(null)

  const debouncedSearch = useDebounce(search, 350)
  const abortRef        = useRef<AbortController | null>(null)

  const showToast = (msg: React.ReactNode) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async (isDebounce = false) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    if (isDebounce) setSearching(true); else setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statut)          params.set('statut',     statut)
      if (debouncedSearch) params.set('search',     debouncedSearch)
      if (filterCategory)  params.set('categoryId', filterCategory)

      const res = await fetch(`/api/vendeur/commandes?${params}`, {
        signal: abortRef.current.signal,
      })
      if (res.ok) setCommandes(await res.json())
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') console.error(e)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }, [statut, debouncedSearch, filterCategory])

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/vendeur/categories')
    if (res.ok) { const d = await res.json(); setCategories(d.approuvees || []) }
  }, [])

  useEffect(() => {
    void (async () => { await fetchCategories() })()
  }, [fetchCategories])

  useEffect(() => {
    void (async () => { await fetchData(!!debouncedSearch) })()
  }, [fetchData, debouncedSearch])

  const handleStatutChange = async (commandeId: string, newStatut: string) => {
    setUpdatingId(commandeId)
    try {
      const res = await fetch(`/api/vendeur/commandes/${commandeId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ statut: newStatut }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        showToast(<><XCircle className="w-4 h-4 inline mr-1" />{' '}{`${d.error || 'Erreur'}`}</>)
        return
      }
      setCommandes(prev => prev.map(c => c.id === commandeId ? { ...c, statut: newStatut } : c))
      if (selected?.id === commandeId) setSelected(prev => prev ? { ...prev, statut: newStatut } : null)
      showToast(`✅ Statut mis à jour : ${statutConfig[newStatut]?.label}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatutSuivant = (s: string) => {
    const idx = ORDRE_STATUTS.indexOf(s)
    if (idx === -1 || idx >= ORDRE_STATUTS.length - 1) return null
    return ORDRE_STATUTS[idx + 1]
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Mes Commandes</h1>

      {/* ── Filtres ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">

        {/* Recherche AJAX */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {searching ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : <Search className="w-4 h-4" />}
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, téléphone, #ID..."
            className="w-full pl-9 pr-8 border border-gray-200 dark:border-gray-700 rounded-xl py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            ><X className="w-4 h-4" /></button>
          )}
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>

        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>{statutConfig[s]?.label}</option>
          ))}
        </select>
      </div>

      {/* ── Liste ── */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : commandes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {search ? `Aucun résultat pour "${search}"` : 'Aucune commande trouvée'}
        </div>
      ) : (
        <div className="space-y-3">
          {commandes.map((cmd) => {
            const sc      = statutConfig[cmd.statut] || { label: cmd.statut, color: '', icon: Package }
            const suivant = getStatutSuivant(cmd.statut)
            return (
              <div key={cmd.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setSelected(cmd)}>
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-gray-400 mb-1">#{cmd.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {cmd.user.prenom} {cmd.user.nom}
                    </p>
                    {cmd.user.telephone && (
                      <a
                        href={`tel:${cmd.user.telephone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                      ><Phone className="w-4 h-4 inline mr-1" />{' '}{cmd.user.telephone}
                      </a>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(cmd.createdAt).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium mb-1 ${sc.color}`}>
                      {(() => { const Icon = sc.icon; return <Icon className="w-3 h-3 inline mr-1" /> })()} {sc.label}
                    </span>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {cmd.totalVendeur.toLocaleString('fr-DZ')} DA
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1 mb-3">
                  {cmd.items.map((item) => {
                    const estReduit = item.prix < item.product.prix && item.prix > 0
                    return (
                      <span key={item.id} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${estReduit ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                        {item.variant?.couleur && (
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.variant.couleur }} />
                        )}
                        {item.product.nom}
                        {item.variant && ` — ${item.variant.nom}`}
                        {item.variantOptionValeur && ` (${item.variantOptionValeur})`}
                        {' '}×{item.quantite}
                        {estReduit && <TrendingDown className="w-3 h-3 shrink-0" />}
                      </span>
                    )
                  })}
                </div>

                {cmd.statut !== 'LIVREE' && cmd.statut !== 'ANNULEE' && (
                  <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100 dark:border-gray-800">
                    {suivant && (
                      <button
                        onClick={() => handleStatutChange(cmd.id, suivant)}
                        disabled={updatingId === cmd.id}
                        className="flex-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                      >
                        {updatingId === cmd.id ? '...' : `→ ${statutConfig[suivant].label}`}
                      </button>
                    )}
                    <button
                      onClick={() => handleStatutChange(cmd.id, 'ANNULEE')}
                      disabled={updatingId === cmd.id}
                      className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    ><XCircle className="w-4 h-4 inline mr-1" />{' '}Annuler
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal détail commande ── */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                Commande #{selected.id.slice(-8).toUpperCase()}
              </h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statutConfig[selected.statut]?.color}`}>
                  {(() => { const Icon = statutConfig[selected.statut]?.icon; return Icon ? <Icon className="w-3 h-3 inline mr-1" /> : null })()} {statutConfig[selected.statut]?.label}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(selected.createdAt).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2"><User className="w-4 h-4 inline mr-1" />{' '}Client</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {selected.user.prenom} {selected.user.nom}
                </p>
                {selected.user.telephone && (
                  <a href={`tel:${selected.user.telephone}`} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-1 font-medium"><Phone className="w-4 h-4 inline mr-1" />{' '}{selected.user.telephone}
                  </a>
                )}
                {selected.user.email && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selected.user.email}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1"><MapPin className="w-4 h-4 inline mr-1" />{' '}{selected.adresse}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Vos produits</p>
                <div className="space-y-2">
                  {selected.items.map((item) => {
                    const img = item.variant?.images?.[0] || item.product.images[0]
                    return (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-2">
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative bg-gray-200 dark:bg-gray-700">
                        {img
                          ? <Image src={img} alt={item.product.nom} fill sizes="48px" className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xl"><Package className="w-8 h-8" /></div>
                        }
                        {item.variant?.couleur && (
                          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800"
                            style={{ backgroundColor: item.variant.couleur }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.product.nom}</p>
                        {item.variant && (
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full mb-0.5">
                            {item.variant.couleur && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.variant.couleur }} />}
                            {item.variant.nom}
                          </span>
                        )}
                        {item.variantOptionValeur && (
                          <span className="inline-flex items-center text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium mb-0.5">
                            {item.variantOptionValeur}
                          </span>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {(() => {
                            const prixBase  = item.product.prix
                            const estReduit = item.prix < prixBase && item.prix > 0
                            const pct       = estReduit ? Math.round((1 - item.prix / prixBase) * 100) : 0
                            return (
                              <span className="flex items-center gap-1 flex-wrap">
                                <span className={estReduit ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                                  ×{item.quantite} — {item.prix.toLocaleString('fr-DZ')} DA/u
                                </span>
                                {estReduit && (
                                  <>
                                    <span className="line-through">{prixBase.toLocaleString('fr-DZ')} DA</span>
                                    <span className="inline-flex items-center gap-0.5 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                                      <TrendingDown className="w-2.5 h-2.5" />−{pct}%
                                    </span>
                                  </>
                                )}
                              </span>
                            )
                          })()}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {(() => {
                          const prixBase  = item.product.prix
                          const estReduit = item.prix < prixBase && item.prix > 0
                          return (
                            <>
                              <p className={`text-sm font-bold ${estReduit ? 'text-green-600 dark:text-green-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {(item.prix * item.quantite).toLocaleString('fr-DZ')} DA
                              </p>
                              {estReduit && (
                                <p className="text-[10px] text-gray-400 line-through">{(prixBase * item.quantite).toLocaleString('fr-DZ')} DA</p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                {(() => {
                  const totalEco = selected.items.reduce((sum, item) => {
                    const diff = item.product.prix - item.prix
                    return sum + (diff > 0 ? diff * item.quantite : 0)
                  }, 0)
                  return (
                    <>
                      {totalEco > 0 && (
                        <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/50 border border-green-100 dark:border-green-900 rounded-xl px-3 py-2">
                          <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400 font-medium">
                            <TrendingDown className="w-4 h-4" /> Économies dégressives
                          </span>
                          <span className="text-sm font-bold text-green-700 dark:text-green-400">
                            −{totalEco.toFixed(2)} DA
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total (vos produits)</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {selected.totalVendeur.toLocaleString('fr-DZ')} DA
                        </p>
                      </div>
                    </>
                  )
                })()}
              </div>

              {selected.statut !== 'LIVREE' && selected.statut !== 'ANNULEE' && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2"><RefreshCw className="w-4 h-4 inline mr-1" />{' '}Changer le statut</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUTS.filter(s => s !== selected.statut).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatutChange(selected.id, s)}
                        disabled={updatingId === selected.id}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
                      >
                        {(() => { const Icon = statutConfig[s].icon; return <Icon className="w-3 h-3 inline mr-1" /> })()} {statutConfig[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}