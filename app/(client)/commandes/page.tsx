'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Check, CheckCircle2, CreditCard, Loader2, Package, PartyPopper, RefreshCw, Truck, Wrench, XCircle, Zap } from 'lucide-react'

type OrderItem = {
  id: string
  quantite: number
  prix: number
  product: { nom: string; images: string[] }
}

type Order = {
  id:                string
  statut:            string
  total:             number
  adresse:           string
  modePaiement:      string
  methodeExpedition: string
  fraisLivraison:    number
  createdAt:         string
  retourDemande:     boolean
  items:             OrderItem[]
}

const statutConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  EN_ATTENTE:     { label: 'En attente',     color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400', icon: Loader2 },
  CONFIRMEE:      { label: 'Confirmée',      color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',         icon: CheckCircle2 },
  EN_PREPARATION: { label: 'En préparation', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400', icon: Wrench },
  EXPEDIEE:       { label: 'Expédiée',       color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400', icon: Truck },
  LIVREE:         { label: 'Livrée',         color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',     icon: Package },
  ANNULEE:        { label: 'Annulée',        color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',             icon: XCircle },
}

function CommandesContent() {
  const searchParams = useSearchParams()
  const success      = searchParams.get('success')

  const [commandes, setCommandes]               = useState<Order[]>([])
  const [loading, setLoading]                   = useState(true)
  const [expanded, setExpanded]                 = useState<string | null>(null)
  const [confirmingId, setConfirmingId]         = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/commandes')
      .then(r => r.json())
      .then(data => { setCommandes(data); setLoading(false) })
  }, [])

  // ── Confirmation de réception ────────────────────────────────────────────
  const handleConfirmerReception = async (commandeId: string) => {
    setConfirmingId(commandeId)
    try {
      const res = await fetch(`/api/commandes/${commandeId}/scan-livraison`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      })
      const data = await res.json()
      if (data.delivery_confirmed) {
        setCommandes(prev => prev.map(c =>
          c.id === commandeId ? { ...c, statut: 'LIVREE' } : c
        ))
      }
    } catch {
      console.error('Erreur confirmation réception')
    } finally {
      setConfirmingId(null)
    }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 pt-4 text-center text-gray-500 dark:text-gray-400">
      Chargement des commandes...
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pt-4">

      {/* Succès commande */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
          <span className="text-2xl"><PartyPopper className="w-8 h-8" /></span>
          <div>
            <p className="font-semibold">Commande passée avec succès !</p>
            <p className="text-sm">Vous pouvez suivre votre commande ci-dessous.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Mes Commandes</h1>
        <Link
          href="/commandes/nouveau"
          className="hidden sm:inline-flex bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + Nouvelle commande
        </Link>
      </div>

      {commandes.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Aucune commande</h2>
          <Link href="/produits" className="bg-black dark:bg-white text-white dark:text-black font-semibold px-8 py-3 rounded-xl hover:bg-gray-800 transition">
            Voir les produits
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {commandes.map(commande => {
            const statut     = statutConfig[commande.statut] ?? statutConfig.EN_ATTENTE
            const isExpanded = expanded === commande.id
            const canConfirm = commande.statut === 'EXPEDIEE'

            return (
              <div
                key={commande.id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
              >
                {/* ── En-tête de la commande ── */}
                <div
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  onClick={() => setExpanded(isExpanded ? null : commande.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">#{commande.id.slice(-8).toUpperCase()}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(commande.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statut.color}`}>
                      {(() => { const Icon = statut.icon; return <Icon className="w-3 h-3 inline mr-1" /> })()} {statut.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* ── Bouton confirmer réception ── */}
                    {canConfirm && (
                      <button
                        onClick={e => { e.stopPropagation(); handleConfirmerReception(commande.id) }}
                        disabled={confirmingId === commande.id}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {confirmingId === commande.id
                          ? <><RefreshCw className="w-4 h-4 inline mr-1 animate-spin" />Confirmation...</>
                          : <><CheckCircle2 className="w-4 h-4 inline mr-1" />Confirmer réception</>
                        }
                      </button>
                    )}

                    {/* ── Bouton retour ── */}
                    {commande.statut === 'LIVREE' && (
                      commande.retourDemande ? (
                        <span
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-default"
                        ><Check className="w-4 h-4 inline mr-1" />Retour demandé
                        </span>
                      ) : (
                        <a
                          href={`/retours?orderId=${commande.id}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 transition"
                        >
                          ↩ Retour
                        </a>
                      )
                    )}

                    <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">{commande.total.toFixed(2)} DA</p>
                    <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* ── Détail déplié ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-4">

                    {/* Suivi */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-3"><Zap className="w-4 h-4 inline mr-1" />Suivi</p>
                      <div className="flex items-center gap-1">
                        {['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE'].map((s, i) => {
                          const list         = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE']
                          const currentIndex = list.indexOf(commande.statut)
                          const isDone       = i <= currentIndex
                          const cfg          = statutConfig[s]
                          return (
                            <div key={s} className="flex items-center flex-1">
                              <div className="flex flex-col items-center flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isDone ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                  {(() => { const Icon = cfg.icon; return <Icon className="w-4 h-4" /> })()}
                                </div>
                                <p className={`text-xs mt-1 text-center hidden sm:block ${isDone ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-400'}`}>
                                  {cfg.label}
                                </p>
                              </div>
                              {i < 4 && (
                                <div className={`h-0.5 flex-1 ${i < currentIndex ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Articles */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-3"><Package className="w-4 h-4 inline mr-1" />Articles</p>
                      <div className="space-y-3">
                        {commande.items.map(item => (
                          <div key={item.id} className="flex items-start gap-3">
                            <div className="relative w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                              {item.product.images[0]
                                ? <Image src={item.product.images[0]} alt={item.product.nom} fill sizes="40px" className="object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5" /></div>
                              }
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.product.nom}</p>
                              <p className="text-xs text-gray-500">x{item.quantite} — {item.prix.toFixed(2)} DA/u</p>
                            </div>
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 shrink-0">
                              {(item.prix * item.quantite).toFixed(2)} DA
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Infos paiement & livraison */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        <p className="text-gray-400 mb-1"><CreditCard className="w-4 h-4 inline mr-1" />Paiement</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">{commande.modePaiement || 'Paiement à la livraison'}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        <p className="text-gray-400 mb-1"><Truck className="w-4 h-4 inline mr-1" />Expédition</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">{commande.methodeExpedition || 'Livraison standard'}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        <p className="text-gray-400 mb-1"><Package className="w-4 h-4 inline mr-1" />Frais livraison</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">{(commande.fraisLivraison ?? 700).toFixed(2)} DA</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1">
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>Sous-total articles</span>
                        <span>{(commande.total - (commande.fraisLivraison ?? 700)).toFixed(2)} DA</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>Frais de livraison</span>
                        <span>{(commande.fraisLivraison ?? 700).toFixed(2)} DA</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-1 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-gray-800 dark:text-gray-100">Total</span>
                        <span className="text-blue-600 dark:text-blue-400">{commande.total.toFixed(2)} DA</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CommandesPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">Chargement...</div>}>
      <CommandesContent />
    </Suspense>
  )
}