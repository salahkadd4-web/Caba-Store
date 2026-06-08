'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useScrollLock } from '@/lib/hooks/useScrollLock'
import { Store, Phone, Mail, MapPin, ChevronRight } from 'lucide-react'

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
  const [vendeur, setVendeur] = useState<VendeurInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)

  // ── Drag state ──────────────────────────────────────────────
  const sheetRef   = useRef<HTMLDivElement>(null)
  const dragY      = useRef(0)
  const startY     = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    fetch(`/api/produits/${produitId}/vendeur`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setVendeur(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [produitId])

  useScrollLock(open)

  // Reset sheet position on close
  useEffect(() => {
    if (!open) {
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0)'
        sheetRef.current.style.transition = ''
      }
      dragY.current = 0
    }
  }, [open])

  const onDragStart = useCallback((clientY: number) => {
    isDragging.current = true
    startY.current = clientY
    dragY.current = 0
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }, [])

  const onDragMove = useCallback((clientY: number) => {
    if (!isDragging.current || !sheetRef.current) return
    const delta = clientY - startY.current
    if (delta < 0) return // ne pas tirer vers le haut
    dragY.current = delta
    sheetRef.current.style.transform = `translateY(${delta}px)`
  }, [])

  const onDragEnd = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return
    isDragging.current = false
    const sheet = sheetRef.current
    sheet.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'
    if (dragY.current > 120) {
      // Fermer : glisser hors écran
      const height = sheet.offsetHeight
      sheet.style.transform = `translateY(${height}px)`
      setTimeout(() => setOpen(false), 300)
    } else {
      // Revenir en position
      sheet.style.transform = 'translateY(0)'
      dragY.current = 0
    }
  }, [])

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientY)
  const onTouchMove  = (e: React.TouchEvent) => onDragMove(e.touches[0].clientY)
  const onTouchEnd   = () => onDragEnd()

  // Mouse events (desktop fallback)
  const onMouseDown = (e: React.MouseEvent) => {
    onDragStart(e.clientY)
    const move = (ev: MouseEvent) => onDragMove(ev.clientY)
    const up   = () => { onDragEnd(); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const nomBoutique = vendeur?.nomBoutique
    ?? (`${vendeur?.user.prenom ?? ''} ${vendeur?.user.nom ?? ''}`.trim() || 'Boutique')

  if (loading) return (
    <div className="w-full h-14 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 animate-pulse" />
  )
  if (!vendeur) return null

  return (
    <>
      {/* ── Bouton déclencheur ── */}
      <button
        onClick={() => setOpen(true)}
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

      {/* ── Bottom Sheet ── */}
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">

          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div
            ref={sheetRef}
            className="relative z-10 w-full bg-white dark:bg-stone-900 rounded-t-3xl shadow-2xl"
            style={{ maxHeight: '85dvh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Zone draggable — handle + header */}
            <div
              className="cursor-grab active:cursor-grabbing select-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onMouseDown={onMouseDown}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-5 pb-4 pt-1 border-b border-stone-100 dark:border-stone-800">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6 text-orange-700 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">
                    {vendeur.isAdmin ? 'Boutique officielle' : 'Vendeur'}
                  </p>
                  <p className="text-lg font-semibold text-stone-900 dark:text-stone-100 leading-tight truncate">
                    {nomBoutique}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenu scrollable */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85dvh - 120px)' }}>
              <div className="px-5 py-4 space-y-2">

                {/* Nom */}
                {(vendeur.user.nom || vendeur.user.prenom) && (
                  <div className="flex items-center gap-4 py-3 border-b border-stone-100 dark:border-stone-800">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-stone-500 dark:text-stone-400">
                        {(vendeur.user.prenom?.[0] ?? '') + (vendeur.user.nom?.[0] ?? '')}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Contact</p>
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                        {vendeur.user.prenom} {vendeur.user.nom}
                      </p>
                    </div>
                  </div>
                )}

                {/* Wilaya */}
                {vendeur.user.wilaya && (
                  <div className="flex items-center gap-4 py-3 border-b border-stone-100 dark:border-stone-800">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Wilaya</p>
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{vendeur.user.wilaya}</p>
                    </div>
                  </div>
                )}

                {/* Téléphone */}
                {vendeur.user.telephone && (
                  <a
                    href={`tel:${vendeur.user.telephone}`}
                    className="flex items-center gap-4 py-3 border-b border-stone-100 dark:border-stone-800 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-950 flex items-center justify-center shrink-0 transition-colors">
                      <Phone className="w-5 h-5 text-stone-500 dark:text-stone-400 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Téléphone</p>
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">
                        {vendeur.user.telephone}
                      </p>
                    </div>
                  </a>
                )}

                {/* Email */}
                {vendeur.user.email && (
                  <a
                    href={`mailto:${vendeur.user.email}`}
                    className="flex items-center gap-4 py-3 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-950 flex items-center justify-center shrink-0 transition-colors">
                      <Mail className="w-5 h-5 text-stone-500 dark:text-stone-400 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Email</p>
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors truncate">
                        {vendeur.user.email}
                      </p>
                    </div>
                  </a>
                )}
              </div>

              {/* CTA Appel */}
              {vendeur.user.telephone && (
                <div className="px-5 pt-2 pb-4">
                  <a
                    href={`tel:${vendeur.user.telephone}`}
                    className="w-full flex items-center justify-center gap-2 bg-orange-700 hover:bg-orange-800 active:bg-orange-900 text-white font-semibold py-4 rounded-2xl transition-colors text-base"
                  >
                    <Phone className="w-5 h-5" />
                    {vendeur.isAdmin ? 'Appeler Caba Store' : 'Appeler le vendeur'}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}