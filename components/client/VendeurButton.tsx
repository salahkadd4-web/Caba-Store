'use client'

import { useState, useEffect } from 'react'
import { Store, Phone, Mail, MapPin, ChevronRight, X } from 'lucide-react'

type VendeurInfo = {
  id: string
  nomBoutique: string | null
  isAdmin: boolean
  user: {
    nom: string | null
    prenom: string | null
    telephone: string | null
    email: string | null
    wilaya: string | null
  }
}

export default function VendeurButton({ produitId }: { produitId: string }) {
  const [vendeur, setVendeur]   = useState<VendeurInfo | null>(null)
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/produits/${produitId}/vendeur`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setVendeur(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [produitId])

  // Nom affiché de la boutique
  const nomBoutique = vendeur?.nomBoutique
    ?? (`${vendeur?.user.prenom ?? ''} ${vendeur?.user.nom ?? ''}`.trim() || 'Boutique')

  if (loading) {
    return (
      <div className="w-full h-14 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 animate-pulse" />
    )
  }

  if (!vendeur) return null

  return (
    <>
      {/* ── Bouton ── */}
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-orange-300 dark:hover:border-orange-700 bg-white dark:bg-stone-900 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all group text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center shrink-0">
          <Store className="w-4 h-4 text-orange-700 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {vendeur.isAdmin ? 'Boutique officielle' : 'Vendu par'}
          </p>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
            {nomBoutique}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors shrink-0" />
      </button>

      {/* ── Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setModalOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panneau */}
          <div
            className="relative z-10 w-full sm:max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-orange-700 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">
                    {vendeur.isAdmin ? 'Boutique officielle' : 'Vendeur'}
                  </p>
                  <p className="text-base font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                    {nomBoutique}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Infos */}
            <div className="px-5 py-5 space-y-3">
              {(vendeur.user.nom || vendeur.user.prenom) && (
                <div className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-300">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-stone-500">
                      {(vendeur.user.prenom?.[0] ?? '') + (vendeur.user.nom?.[0] ?? '')}
                    </span>
                  </div>
                  <span>{vendeur.user.prenom} {vendeur.user.nom}</span>
                </div>
              )}
              {vendeur.user.wilaya && (
                <div className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-300">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-stone-500" />
                  </div>
                  <span>{vendeur.user.wilaya}</span>
                </div>
              )}
              {vendeur.user.telephone && (
                <a
                  href={`tel:${vendeur.user.telephone}`}
                  className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-300 hover:text-orange-700 dark:hover:text-orange-400 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-950 flex items-center justify-center shrink-0 transition-colors">
                    <Phone className="w-4 h-4 text-stone-500 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors" />
                  </div>
                  <span>{vendeur.user.telephone}</span>
                </a>
              )}
              {vendeur.user.email && (
                <a
                  href={`mailto:${vendeur.user.email}`}
                  className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-300 hover:text-orange-700 dark:hover:text-orange-400 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-950 flex items-center justify-center shrink-0 transition-colors">
                    <Mail className="w-4 h-4 text-stone-500 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors" />
                  </div>
                  <span className="truncate">{vendeur.user.email}</span>
                </a>
              )}
            </div>

            {/* CTA */}
            {vendeur.user.telephone && (
              <div className="px-5 pb-6">
                <a
                  href={`tel:${vendeur.user.telephone}`}
                  className="w-full flex items-center justify-center gap-2 bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
                >
                  <Phone className="w-4 h-4" />
                  {vendeur.isAdmin ? 'Appeler Caba Store' : 'Appeler le vendeur'}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
