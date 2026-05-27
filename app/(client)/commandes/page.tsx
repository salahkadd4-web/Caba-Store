'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Check, CheckCircle2, CreditCard, Loader2, Package, PartyPopper, Truck, Wrench, XCircle, Zap } from 'lucide-react'

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
  CONFIRMEE:      { label: 'Confirmée',      color: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400', icon: CheckCircle2 },
  EN_PREPARATION: { label: 'En préparation', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400', icon: Wrench },
  EXPEDIEE:       { label: 'Expédiée',       color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',          icon: Truck },
  LIVREE:         { label: 'Livrée',         color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',      icon: Package },
  ANNULEE:        { label: 'Annulée',        color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',              icon: XCircle },
}


function CommandesContent() {
  const searchParams      = useSearchParams()
  const success           = searchParams.get('success')
  const [commandes, setCommandes] = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/commandes')
      .then(r => r.json())
      .then(data => { setCommandes(data); setLoading(false) })
  }, [])

  /* ── Loading ── */
  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="w-8 h-8 border-2 border-stone-200 border-t-orange-700 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-stone-500 dark:text-stone-400">Chargement des commandes…</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-20 md:pb-12">

      {/* Bannière succès */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-6 py-4 rounded-2xl mb-6 flex items-center gap-3">
          <PartyPopper className="w-8 h-8 shrink-0" />
          <div>
            <p className="font-semibold">Commande passée avec succès !</p>
            <p className="text-sm opacity-80">Vous pouvez suivre votre commande ci-dessous.</p>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1">
            Espace client
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Mes commandes
          </h1>
        </div>
        <Link
          href="/commandes/nouveau"
          className="hidden sm:inline-flex items-center gap-1.5 bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          + Nouvelle commande
        </Link>
      </div>

      {/* État vide */}
      {commandes.length === 0 ? (
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
          {commandes.map(commande => {
            const statut     = statutConfig[commande.statut] ?? statutConfig.EN_ATTENTE
            const isExpanded = expanded === commande.id

            return (
              <div
                key={commande.id}
                className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden"
              >
                {/* ── En-tête commande ── */}
                <div
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 transition"
                  onClick={() => setExpanded(isExpanded ? null : commande.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">
                        #{commande.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        {new Date(commande.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${statut.color}`}>
                      {(() => { const Icon = statut.icon; return <Icon className="w-3 h-3" /> })()} {statut.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Bouton retour */}
                    {commande.statut === 'LIVREE' && (
                      commande.retourDemande ? (
                        <span
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 cursor-default"
                        >
                          <Check className="w-3.5 h-3.5" /> Retour demandé
                        </span>
                      ) : (
                        <a
                          href={`/retours?orderId=${commande.id}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition"
                        >
                          ↩ Retour
                        </a>
                      )
                    )}
                    <p className="font-semibold text-orange-700 dark:text-orange-400 text-lg tabular-nums">
                      {commande.total.toFixed(2)} DA
                    </p>
                    <span className="text-stone-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* ── Détail déplié ── */}
                {isExpanded && (
                  <div className="border-t border-stone-100 dark:border-stone-800 px-5 py-4 space-y-5">

                    {/* Suivi */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> Suivi de commande
                      </p>
                      <div className="flex items-center gap-1">
                        {['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE'].map((s, i) => {
                          const list         = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE']
                          const currentIndex = list.indexOf(commande.statut)
                          const isDone       = i <= currentIndex
                          const cfg          = statutConfig[s]
                          return (
                            <div key={s} className="flex items-center flex-1">
                              <div className="flex flex-col items-center flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDone ? 'bg-orange-700 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-400'}`}>
                                  {(() => { const Icon = cfg.icon; return <Icon className="w-4 h-4" /> })()}
                                </div>
                                <p className={`text-xs mt-1 text-center hidden sm:block ${isDone ? 'text-orange-700 dark:text-orange-400 font-medium' : 'text-stone-400'}`}>
                                  {cfg.label}
                                </p>
                              </div>
                              {i < 4 && (
                                <div className={`h-0.5 flex-1 ${i < currentIndex ? 'bg-orange-700' : 'bg-stone-200 dark:bg-stone-700'}`} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Articles */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" /> Articles
                      </p>
                      <div className="space-y-3">
                        {commande.items.map(item => (
                          <div key={item.id} className="flex items-start gap-3">
                            <div className="relative w-11 h-11 bg-stone-100 dark:bg-stone-800 rounded-xl overflow-hidden shrink-0">
                              {item.product.images[0]
                                ? <Image src={item.product.images[0]} alt={item.product.nom} fill sizes="44px" className="object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-stone-400" /></div>
                              }
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{item.product.nom}</p>
                              <p className="text-xs text-stone-500 dark:text-stone-400">×{item.quantite} — {item.prix.toFixed(2)} DA/u</p>
                            </div>
                            <p className="font-semibold text-sm text-stone-800 dark:text-stone-100 shrink-0 tabular-nums">
                              {(item.prix * item.quantite).toFixed(2)} DA
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Infos paiement & livraison */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3">
                        <p className="text-stone-400 mb-1 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Paiement</p>
                        <p className="font-medium text-stone-700 dark:text-stone-300">{commande.modePaiement || 'À la livraison'}</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3">
                        <p className="text-stone-400 mb-1 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Expédition</p>
                        <p className="font-medium text-stone-700 dark:text-stone-300">{commande.methodeExpedition || 'Standard'}</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3">
                        <p className="text-stone-400 mb-1 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Livraison</p>
                        <p className="font-medium text-stone-700 dark:text-stone-300">{(commande.fraisLivraison ?? 700).toFixed(2)} DA</p>
                      </div>
                    </div>

                    {/* Totaux */}
                    <div className="border-t border-stone-100 dark:border-stone-800 pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400">
                        <span>Sous-total articles</span>
                        <span className="tabular-nums">{(commande.total - (commande.fraisLivraison ?? 700)).toFixed(2)} DA</span>
                      </div>
                      <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400">
                        <span>Frais de livraison</span>
                        <span className="tabular-nums">{(commande.fraisLivraison ?? 700).toFixed(2)} DA</span>
                      </div>
                      <div className="flex justify-between font-semibold text-base pt-2 border-t border-stone-100 dark:border-stone-800">
                        <span className="text-stone-800 dark:text-stone-100">Total</span>
                        <span className="text-orange-700 dark:text-orange-400 tabular-nums">{commande.total.toFixed(2)} DA</span>
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
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-orange-700 rounded-full animate-spin mx-auto" />
      </div>
    }>
      <CommandesContent />
    </Suspense>
  )
}
