'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import Image from 'next/image'
import {
  ShoppingCart, Check, X, TrendingDown,
  Package, ChevronRight,
  Trash2, ShoppingBag, Loader2, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { getPrixUnitaire, parsePrixTiers } from '@/lib/prix'
import QteInput from '@/components/client/QteInput'
import VendeurButton from '@/components/client/VendeurButton'

// ─── Types ────────────────────────────────────────────────────────────────────

type VariantOption = { id: string; valeur: string; stock: number }
type Variant = {
  id: string; nom: string; couleur: string | null
  stock: number; images: string[]; options: VariantOption[]
}
type Produit = {
  id: string; nom: string; prix: number; stock: number; images: string[]
  prixVariables: unknown; typeOption: string | null; variants: Variant[]
}
type LigneSelection = {
  key: string; variantId: string; optionId?: string
  variantNom: string; couleur: string | null; optionValeur?: string
  stockMax: number; quantite: number; image?: string
}

export default function ProduitDetailClient({
  produit,
}: {
  produit: Produit
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const isMobile = useIsMobile()

  const tiers       = useMemo(
    () => parsePrixTiers(produit.prixVariables).sort((a, b) => a.minQte - b.minQte),
    [produit.prixVariables],
  )
  const hasTiers    = tiers.length > 0
  const hasVariants = produit.variants.length > 0
  const typeOpt     = produit.typeOption || 'Taille'
  const hasOptions  = produit.variants.some(v => v.options.length > 0)

  const [imageIdx, setImageIdx] = useState(0)
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null)

  const previewVariant = useMemo(
    () => produit.variants.find(v => v.id === hoveredVariant) ?? null,
    [hoveredVariant, produit.variants]
  )

  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    hasVariants ? produit.variants[0].id : null
  )
  const activeVariant = useMemo(
    () => produit.variants.find(v => v.id === activeVariantId) ?? null,
    [activeVariantId, produit.variants]
  )

  const images = useMemo(() => {
    if (previewVariant?.images.length) return previewVariant.images
    if (activeVariant?.images.length)  return activeVariant.images
    return produit.images
  }, [previewVariant, activeVariant, produit.images])

  const [lignes, setLignes] = useState<LigneSelection[]>([])
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [errors, setErrors]     = useState<string[]>([])
  const [recapOpen, setRecapOpen] = useState(false)

  const totalQte   = lignes.reduce((s, l) => s + l.quantite, 0)
  const prixUnit   = getPrixUnitaire(tiers, totalQte, produit.prix)
  const prixReduit = hasTiers && prixUnit < produit.prix
  const totalPrix  = prixUnit * totalQte

  const prochainPalier = useMemo(() => {
    if (!hasTiers) return null
    return tiers.find(t => t.minQte > totalQte) ?? null
  }, [tiers, totalQte, hasTiers])

  const upsertLigne = useCallback((
    variantId: string, variantNom: string, couleur: string | null,
    stockMax: number, delta: number,
    optionId?: string, optionValeur?: string, image?: string
  ) => {
    const key = optionId ? `${variantId}__${optionId}` : variantId
    setLignes(prev => {
      const existing = prev.find(l => l.key === key)
      const newQte   = Math.max(0, Math.min(stockMax, (existing?.quantite ?? 0) + delta))
      if (existing) {
        if (newQte === 0) return prev.filter(l => l.key !== key)
        return prev.map(l => l.key === key ? { ...l, quantite: newQte } : l)
      }
      if (newQte === 0) return prev
      return [...prev, { key, variantId, optionId, variantNom, couleur, optionValeur, stockMax, quantite: newQte, image }]
    })
  }, [])

  const setLigneQte = useCallback((key: string, qte: number) => {
    setLignes(prev => {
      const l = prev.find(l => l.key === key)
      if (!l) return prev
      const capped = Math.max(0, Math.min(l.stockMax, qte))
      if (capped === 0) return prev.filter(l => l.key !== key)
      return prev.map(l => l.key === key ? { ...l, quantite: capped } : l)
    })
  }, [])

  const removeLigne = useCallback((key: string) => {
    setLignes(prev => prev.filter(l => l.key !== key))
  }, [])

  const qteOf = (key: string) => lignes.find(l => l.key === key)?.quantite ?? 0

  const handleAjouter = async () => {
    if (!session) { router.push('/connexion'); return }
    if (lignes.length === 0) return
    setSending(true); setErrors([])
    const errs: string[] = []
    for (const l of lignes) {
      try {
        const res = await fetch('/api/panier', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ produitId: produit.id, quantite: l.quantite, variantId: l.variantId, variantOptionId: l.optionId }),
        })
        if (!res.ok) { const d = await res.json(); errs.push(`${l.variantNom}${l.optionValeur ? ` / ${l.optionValeur}` : ''} : ${d.error ?? 'Erreur'}`) }
      } catch { errs.push(`${l.variantNom} : erreur réseau`) }
    }
    setSending(false)
    if (errs.length) { setErrors(errs); return }
    setSent(true); setLignes([]); setRecapOpen(false)
    setTimeout(() => setSent(false), 3000)
  }

  const [qteSimple, setQteSimple] = useState(1)
  const [loadingSimple, setLoadingSimple] = useState(false)
  const [successSimple, setSuccessSimple] = useState(false)

  const handleAddSimple = async () => {
    if (!session) { router.push('/connexion'); return }
    setLoadingSimple(true)
    try {
      const res = await fetch('/api/panier', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produitId: produit.id, quantite: qteSimple }),
      })
      if (res.ok) { setSuccessSimple(true); setTimeout(() => setSuccessSimple(false), 2500) }
    } finally { setLoadingSimple(false) }
  }

  //  RENDU MOBILE
  // ═══════════════════════════════════════════
  if (isMobile) {
    return (
      <div className="flex flex-col pb-52">

        {/* Galerie compacte 4:3 */}
        <div className="relative bg-stone-100 dark:bg-stone-800 rounded-2xl overflow-hidden mb-3" style={{ aspectRatio: '4/3' }}>
          {images[imageIdx]
            ? <Image key={`${images[imageIdx]}-${imageIdx}`} src={images[imageIdx]} alt={produit.nom} fill priority sizes="100vw" className="object-cover" />
            : <Package className="w-20 h-20 text-stone-300 dark:text-stone-600 absolute inset-0 m-auto" />
          }
          {previewVariant && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/65 text-white text-xs px-2.5 py-1.5 rounded-full backdrop-blur-sm">
              {previewVariant.couleur && <span className="w-3 h-3 rounded-full border border-white/40 shrink-0" style={{ backgroundColor: previewVariant.couleur }} />}
              <span>{previewVariant.nom}</span>
            </div>
          )}
        </div>

        {/* Miniatures */}
        {images.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button key={i} onClick={() => setImageIdx(i)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${i === imageIdx ? 'border-orange-700 shadow-md' : 'border-stone-200 dark:border-stone-700 opacity-60'}`}>
                <Image src={img} alt="" width={56} height={56} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Prix */}
        <div className="mb-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-2xl font-bold ${prixReduit && totalQte > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-700 dark:text-orange-500'}`}>
              {prixUnit.toFixed(2)} DA
              {totalQte > 1 && <span className="text-sm font-normal text-stone-400 ml-1">/u.</span>}
            </span>
            {prixReduit && totalQte > 0 && (
              <>
                <span className="text-base text-stone-400 line-through">{produit.prix.toFixed(2)} DA</span>
                <span className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-semibold px-2 py-0.5 rounded-full">
                  -{Math.round((1 - prixUnit / produit.prix) * 100)}%
                </span>
              </>
            )}
          </div>
          {prochainPalier && totalQte > 0 && (
            <p className="mt-1 text-xs text-orange-700 dark:text-orange-500 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 shrink-0" />
              Ajoutez <strong>{prochainPalier.minQte - totalQte}</strong> de plus &rarr; {prochainPalier.prix.toFixed(2)} DA/u.
            </p>
          )}
        </div>

        {/* Bouton vendeur */}
        <div className="mb-4">
          <VendeurButton produitId={produit.id} />
        </div>

        {/* Paliers dégressifs */}
        {hasTiers && (
          <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900 rounded-xl p-3 mb-4">
            <p className="text-[10px] font-bold text-orange-700 dark:text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Prix dégressifs
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tiers.map((tier, i) => {
                const isActive = totalQte >= tier.minQte && (tier.maxQte === null || totalQte <= tier.maxQte)
                const isPast   = tier.maxQte !== null && totalQte > tier.maxQte
                return (
                  <div key={i} className={`flex flex-col items-center px-3 py-1.5 rounded-lg text-xs shrink-0 transition-all ${isActive ? 'bg-orange-700 text-white shadow-md scale-105' : isPast ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 opacity-60' : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700'}`}>
                    <span className="font-bold">{tier.prix.toFixed(2)} DA</span>
                    <span className="opacity-75">{tier.maxQte ? `${tier.minQte}-${tier.maxQte}u.` : `>=${tier.minQte}u.`}</span>
                    {isActive && <Check className="w-3 h-3 mt-0.5" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sans variantes */}
        {!hasVariants && (
          <div className="space-y-4 mb-4">
            <div className={`flex items-center gap-2 text-sm font-medium ${produit.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {produit.stock > 0 ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {produit.stock > 0 ? `En stock (${produit.stock} disponibles)` : 'Rupture de stock'}
            </div>
            {produit.stock > 0 && (
              <div className="flex items-center gap-3">
                <QteInput value={qteSimple} stockMax={produit.stock} onChange={setQteSimple} />
                <span className="text-xs text-stone-400">{produit.stock} dispo.</span>
              </div>
            )}
          </div>
        )}

        {/* Avec variantes */}
        {hasVariants && (
          <>
            {/* Swatches couleur */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                {produit.variants.some(v => v.couleur) ? 'Couleur' : 'Variante'}
                {activeVariant && <span className="ml-2 font-normal text-stone-400 text-xs">— {activeVariant.nom}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {produit.variants.map(variant => {
                  const isActive   = variant.id === activeVariantId
                  const qteLigne   = hasOptions ? variant.options.reduce((s, o) => s + qteOf(`${variant.id}__${o.id}`), 0) : qteOf(variant.id)
                  const outOfStock = hasOptions ? variant.options.every(o => o.stock === 0) : variant.stock === 0
                  return (
                    <button key={variant.id}
                      onClick={() => {
                        if (outOfStock) return
                        setActiveVariantId(variant.id)
                        setImageIdx(0)
                      }}
                      disabled={outOfStock}
                      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${isActive ? 'border-orange-700 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/60 shadow-sm' : outOfStock ? 'border-stone-200 dark:border-stone-700 opacity-30 cursor-not-allowed' : 'border-stone-200 dark:border-stone-700'}`}
                    >
                      {variant.couleur && <span className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-500 shrink-0 shadow-sm" style={{ backgroundColor: variant.couleur }} />}
                      <span className="text-stone-800 dark:text-stone-200">{variant.nom}</span>
                      {qteLigne > 0 && <span className="ml-1 bg-orange-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">{qteLigne}</span>}
                      {outOfStock && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center shadow"><X className="w-2.5 h-2.5" /></span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Options (tailles, etc.) */}
            {activeVariant && (
              <div className="mb-4">
                {hasOptions ? (
                  <div>
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      {typeOpt}
                      <span className="ml-2 font-normal text-stone-400 text-xs">— touchez pour ajouter</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeVariant.options.map(option => {
                        const key = `${activeVariant.id}__${option.id}`
                        const qt  = qteOf(key)
                        const outOfStock = option.stock === 0
                        const maxReached = qt >= option.stock
                        return (
                          <div key={option.id}
                            className={`relative flex items-center rounded-xl border-2 overflow-hidden text-sm transition-all ${outOfStock ? 'border-stone-200 dark:border-stone-700 opacity-30 cursor-not-allowed' : qt > 0 ? 'border-orange-700 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/50 shadow-sm' : 'border-stone-200 dark:border-stone-700'}`}
                          >
                            <button
                              onClick={() => !outOfStock && qt === 0 && upsertLigne(activeVariant.id, activeVariant.nom, activeVariant.couleur, option.stock, 1, option.id, option.valeur, activeVariant.images[0] ?? produit.images[0])}
                              disabled={outOfStock}
                              className={`min-w-11 px-2 h-10 flex items-center justify-center font-semibold text-sm ${outOfStock ? 'cursor-not-allowed line-through text-stone-400' : qt > 0 ? 'cursor-default text-orange-700 dark:text-orange-400' : 'cursor-pointer text-stone-700 dark:text-stone-200'}`}
                            >
                              {option.valeur}
                            </button>
                            {qt > 0 && (
                              <div className="pr-1.5">
                                <QteInput size="sm" value={qt} stockMax={option.stock} onChange={v => setLigneQte(key, v)} onZero={() => removeLigne(key)} />
                              </div>
                            )}
                            {maxReached && <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full shadow leading-none">MAX</span>}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3 shrink-0" />
                      Touchez une taille pour l&apos;ajouter — utilisez +/- pour ajuster
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Quantité</p>
                    <QteInput
                      value={qteOf(activeVariant.id) || 1}
                      stockMax={activeVariant.stock}
                      onChange={v => {
                        const key = activeVariant.id
                        if (v === 0) { removeLigne(key); return }
                        const existing = lignes.find(l => l.key === key)
                        if (existing) setLigneQte(key, v)
                        else upsertLigne(activeVariant.id, activeVariant.nom, activeVariant.couleur, activeVariant.stock, v, undefined, undefined, activeVariant.images[0] ?? produit.images[0])
                      }}
                      onZero={() => removeLigne(activeVariant.id)}
                    />
                    <span className="text-xs text-stone-400">{activeVariant.stock} dispo.</span>
                  </div>
                )}
              </div>
            )}

            {/* Erreurs */}
            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 space-y-1 mb-4">
                {errors.map((e, i) => <p key={i} className="text-sm text-red-600 dark:text-red-400">{e}</p>)}
              </div>
            )}
          </>
        )}

        {/* ── BARRE STICKY MOBILE ── */}
        <div
          className="fixed bottom-16 left-0 right-0 z-40 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Récap collapsible */}
          {lignes.length > 0 && (
            <div>
              <button
                onClick={() => setRecapOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-stone-50 dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-widest">Ma sélection</span>
                  <span className="bg-orange-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{totalQte}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${prixReduit ? 'text-green-600 dark:text-green-400' : 'text-orange-700 dark:text-orange-500'}`}>
                    {totalPrix.toFixed(2)} DA
                  </span>
                  {recapOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronUp className="w-4 h-4 text-stone-400" />}
                </div>
              </button>

              {recapOpen && (
                <div className="max-h-52 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 bg-white dark:bg-stone-950">
                  {lignes.map(ligne => (
                    <div key={ligne.key} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {ligne.image ? <Image src={ligne.image} alt="" width={32} height={32} className="w-full h-full object-cover" /> : <Package className="w-3.5 h-3.5 text-stone-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {ligne.couleur && <span className="w-2.5 h-2.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0" style={{ backgroundColor: ligne.couleur }} />}
                          <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">{ligne.variantNom}</span>
                          {ligne.optionValeur && (
                            <>
                              <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">{typeOpt} {ligne.optionValeur}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <QteInput size="sm" value={ligne.quantite} stockMax={ligne.stockMax} onChange={v => setLigneQte(ligne.key, v)} onZero={() => removeLigne(ligne.key)} />
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 w-16 text-right shrink-0">{(prixUnit * ligne.quantite).toFixed(2)} DA</span>
                      <button onClick={() => removeLigne(ligne.key)} className="text-red-400 hover:text-red-600 p-1 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  {hasTiers && prixReduit && (
                    <div className="bg-green-50 dark:bg-green-950/40 px-4 py-2 flex items-center justify-between">
                      <span className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Prix dégressif — {prixUnit.toFixed(2)} DA/u.</span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Éco : {((produit.prix - prixUnit) * totalQte).toFixed(2)} DA</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bouton principal */}
          <div className="px-4 py-3">
            {hasVariants ? (
              <button onClick={handleAjouter} disabled={sending || lignes.length === 0}
                className={`w-full font-semibold py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all text-base active:scale-[0.98] ${sent ? 'bg-green-500 text-white shadow-lg' : lignes.length === 0 ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-default' : sending ? 'bg-orange-700 text-white opacity-70' : 'bg-orange-700 hover:bg-orange-800 text-white shadow-lg shadow-orange-700/20'}`}
              >
                {sent ? <><Check className="w-5 h-5" /> Ajouté au panier !</>
                  : sending ? <><Loader2 className="w-5 h-5 animate-spin" /> Ajout en cours…</>
                  : lignes.length === 0 ? <><ShoppingBag className="w-5 h-5" /> Sélectionnez des articles</>
                  : <><ShoppingCart className="w-5 h-5" /><span>Ajouter {totalQte} article{totalQte > 1 ? 's' : ''} au panier</span><span className="ml-auto text-sm font-bold opacity-90">{totalPrix.toFixed(2)} DA</span></>
                }
              </button>
            ) : (
              <button onClick={handleAddSimple} disabled={loadingSimple || produit.stock === 0}
                className={`w-full font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-base ${successSimple ? 'bg-green-500 text-white' : 'bg-orange-700 hover:bg-orange-800 text-white disabled:opacity-50'}`}
              >
                {successSimple ? <><Check className="w-5 h-5" /> Ajouté !</> : loadingSimple ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShoppingCart className="w-5 h-5" /> Ajouter au panier</>}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  //  RENDU DESKTOP
  // ═══════════════════════════════════════════
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

      {/* GALERIE */}
      <div>
        <div className="bg-stone-100 dark:bg-stone-800 rounded-2xl aspect-square max-h-110 flex items-center justify-center overflow-hidden relative">
          {images[imageIdx]
            ? <Image key={`${images[imageIdx]}-${imageIdx}`} src={images[imageIdx]} alt={produit.nom} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover transition-opacity duration-300" />
            : <Package className="w-24 h-24 text-stone-300 dark:text-stone-600" />
          }
          {previewVariant && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/65 text-white text-xs px-2.5 py-1.5 rounded-full backdrop-blur-sm animate-fade-in">
              {previewVariant.couleur && <span className="w-3 h-3 rounded-full border border-white/40 shrink-0" style={{ backgroundColor: previewVariant.couleur }} />}
              <span>{previewVariant.nom}</span>
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {images.map((img, i) => (
              <button key={i} onClick={() => setImageIdx(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition shrink-0 ${i === imageIdx ? 'border-orange-700 shadow-md' : 'border-stone-200 dark:border-stone-700 opacity-60 hover:opacity-100'}`}>
                <Image src={img} alt="" width={64} height={64} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SÉLECTION + RÉCAP */}
      <div className="flex flex-col gap-6">

        {/* Prix */}
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-3xl font-bold transition-colors duration-300 ${prixReduit && totalQte > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-700 dark:text-orange-500'}`}>
              {prixUnit.toFixed(2)} DA
              {totalQte > 1 && <span className="text-base font-normal text-stone-400 ml-1">/u.</span>}
            </span>
            {prixReduit && totalQte > 0 && (
              <>
                <span className="text-lg text-stone-400 line-through font-medium">{produit.prix.toFixed(2)} DA</span>
                <span className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-semibold px-2 py-0.5 rounded-full">-{Math.round((1 - prixUnit / produit.prix) * 100)}%</span>
              </>
            )}
          </div>
          {prochainPalier && totalQte > 0 && (
            <p className="mt-1.5 text-xs text-orange-700 dark:text-orange-500 flex items-center gap-1.5 animate-pulse">
              <TrendingDown className="w-3.5 h-3.5 shrink-0" />
              Ajoutez <strong>{prochainPalier.minQte - totalQte}</strong> de plus &rarr; {prochainPalier.prix.toFixed(2)} DA/u.
            </p>
          )}
        </div>

        {/* Paliers */}
        {hasTiers && (
          <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900 rounded-xl p-3">
            <p className="text-[10px] font-bold text-orange-700 dark:text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Prix dégressifs
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tiers.map((tier, i) => {
                const isActive = totalQte >= tier.minQte && (tier.maxQte === null || totalQte <= tier.maxQte)
                const isPast   = tier.maxQte !== null && totalQte > tier.maxQte
                return (
                  <div key={i} className={`flex flex-col items-center px-3 py-1.5 rounded-lg text-xs transition-all duration-300 ${isActive ? 'bg-orange-700 text-white shadow-md shadow-orange-700/20 scale-105' : isPast ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 opacity-60' : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700'}`}>
                    <span className="font-bold">{tier.prix.toFixed(2)} DA</span>
                    <span className="opacity-75">{tier.maxQte ? `${tier.minQte}-${tier.maxQte}u.` : `>=${tier.minQte}u.`}</span>
                    {isActive && <Check className="w-3 h-3 mt-0.5" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sans variantes */}
        {!hasVariants && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 text-sm font-medium ${produit.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {produit.stock > 0 ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {produit.stock > 0 ? `En stock (${produit.stock} disponibles)` : 'Rupture de stock'}
            </div>
            {produit.stock > 0 && (
              <div className="flex items-center gap-3">
                <QteInput value={qteSimple} stockMax={produit.stock} onChange={setQteSimple} />
                <span className="text-xs text-stone-400">{produit.stock} dispo.</span>
              </div>
            )}
            <button onClick={handleAddSimple} disabled={loadingSimple || produit.stock === 0}
              className={`w-full font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-base ${successSimple ? 'bg-green-500 text-white' : 'bg-orange-700 hover:bg-orange-800 text-white disabled:opacity-50'}`}>
              {successSimple ? <><Check className="w-5 h-5" /> Ajouté !</> : loadingSimple ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShoppingCart className="w-5 h-5" /> Ajouter au panier</>}
            </button>
            {/* Bouton vendeur desktop (sans variantes) */}
            <VendeurButton produitId={produit.id} />
          </div>
        )}

        {/* Avec variantes */}
        {hasVariants && (
          <>
            {/* Swatches */}
            <div>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
                {produit.variants.some(v => v.couleur) ? 'Couleur' : 'Variante'}
                {activeVariant && <span className="ml-2 font-normal text-stone-400 text-xs">— {activeVariant.nom}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {produit.variants.map(variant => {
                  const isActive   = variant.id === activeVariantId
                  const qteLigne   = hasOptions ? variant.options.reduce((s, o) => s + qteOf(`${variant.id}__${o.id}`), 0) : qteOf(variant.id)
                  const outOfStock = hasOptions ? variant.options.every(o => o.stock === 0) : variant.stock === 0
                  return (
                    <button key={variant.id}
                      onClick={() => { if (!outOfStock) { setActiveVariantId(variant.id); setImageIdx(0) } }}
                      onMouseEnter={() => setHoveredVariant(variant.id)}
                      onMouseLeave={() => setHoveredVariant(null)}
                      disabled={outOfStock}
                      title={outOfStock ? 'Rupture de stock' : variant.nom}
                      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${isActive ? 'border-orange-700 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/60 shadow-sm' : outOfStock ? 'border-stone-200 dark:border-stone-700 opacity-30 cursor-not-allowed' : 'border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500'}`}
                    >
                      {variant.couleur && <span className="w-5 h-5 rounded-full border border-stone-300 dark:border-stone-500 shrink-0 shadow-sm" style={{ backgroundColor: variant.couleur }} />}
                      <span className="text-stone-800 dark:text-stone-200">{variant.nom}</span>
                      {qteLigne > 0 && <span className="ml-1 bg-orange-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow">{qteLigne}</span>}
                      {outOfStock && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center shadow"><X className="w-2.5 h-2.5" /></span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Options (tailles) desktop */}
            {activeVariant && (
              <div>
                {hasOptions ? (
                  <div>
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
                      {typeOpt}
                      <span className="ml-2 font-normal text-stone-400 text-xs">— cliquez pour ajouter</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeVariant.options.map(option => {
                        const key = `${activeVariant.id}__${option.id}`
                        const qt  = qteOf(key)
                        const outOfStock = option.stock === 0
                        const maxReached = qt >= option.stock
                        return (
                          <div key={option.id}
                            className={`relative flex items-center rounded-xl border-2 overflow-hidden text-sm transition-all ${outOfStock ? 'border-stone-200 dark:border-stone-700 opacity-30 cursor-not-allowed' : qt > 0 ? 'border-orange-700 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/50 shadow-sm' : 'border-stone-200 dark:border-stone-700 hover:border-orange-500 dark:hover:border-orange-600'}`}
                          >
                            <button
                              onClick={() => !outOfStock && qt === 0 && upsertLigne(activeVariant.id, activeVariant.nom, activeVariant.couleur, option.stock, 1, option.id, option.valeur, activeVariant.images[0] ?? produit.images[0])}
                              disabled={outOfStock}
                              className={`min-w-10 px-2 h-9 flex items-center justify-center font-semibold transition-all ${outOfStock ? 'cursor-not-allowed line-through text-stone-400' : qt > 0 ? 'cursor-default text-orange-700 dark:text-orange-400' : 'cursor-pointer text-stone-700 dark:text-stone-200'}`}
                            >
                              {option.valeur}
                            </button>
                            {qt > 0 && (
                              <div className="pr-1.5">
                                <QteInput size="sm" value={qt} stockMax={option.stock} onChange={v => setLigneQte(key, v)} onZero={() => removeLigne(key)} />
                              </div>
                            )}
                            {maxReached && <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full shadow leading-none">MAX</span>}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3 shrink-0" />
                      Cliquez sur une taille pour l&apos;ajouter — tapez ou utilisez +/- pour ajuster
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Quantité</p>
                    <QteInput
                      value={qteOf(activeVariant.id) || 0}
                      stockMax={activeVariant.stock}
                      onChange={v => {
                        const key = activeVariant.id
                        if (v === 0) { removeLigne(key); return }
                        const existing = lignes.find(l => l.key === key)
                        if (existing) setLigneQte(key, v)
                        else upsertLigne(activeVariant.id, activeVariant.nom, activeVariant.couleur, activeVariant.stock, v, undefined, undefined, activeVariant.images[0] ?? produit.images[0])
                      }}
                      onZero={() => removeLigne(activeVariant.id)}
                    />
                    <span className="text-xs text-stone-400">{activeVariant.stock} dispo.</span>
                  </div>
                )}
              </div>
            )}

            {/* Récap desktop */}
            {lignes.length > 0 && (
              <div className="border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden">
                <div className="bg-stone-50 dark:bg-stone-800/60 px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-widest">Ma sélection</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 dark:text-stone-400">{totalQte} article{totalQte > 1 ? 's' : ''}</span>
                    {totalQte > 0 && <span className={`text-sm font-bold ${prixReduit ? 'text-green-600 dark:text-green-400' : 'text-orange-700 dark:text-orange-500'}`}>= {totalPrix.toFixed(2)} DA</span>}
                  </div>
                </div>
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {lignes.map(ligne => (
                    <div key={ligne.key} className="flex items-center gap-3 px-4 py-2.5 group">
                      <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {ligne.image ? <Image src={ligne.image} alt="" width={36} height={36} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-stone-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {ligne.couleur && <span className="w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600 shrink-0" style={{ backgroundColor: ligne.couleur }} />}
                          <span className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">{ligne.variantNom}</span>
                          {ligne.optionValeur && (
                            <><ChevronRight className="w-3 h-3 text-stone-400 shrink-0" /><span className="text-sm text-stone-500 dark:text-stone-400 shrink-0">{typeOpt} {ligne.optionValeur}</span></>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <QteInput value={ligne.quantite} stockMax={ligne.stockMax} onChange={v => setLigneQte(ligne.key, v)} onZero={() => removeLigne(ligne.key)} />
                      </div>
                      <span className="text-sm font-semibold text-stone-700 dark:text-stone-300 w-20 text-right shrink-0">{(prixUnit * ligne.quantite).toFixed(2)} DA</span>
                      <button onClick={() => removeLigne(ligne.key)} className="opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 p-1 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {hasTiers && prixReduit && (
                  <div className="bg-green-50 dark:bg-green-950/40 border-t border-green-100 dark:border-green-900 px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Prix dégressif appliqué — {prixUnit.toFixed(2)} DA/u.</span>
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Économie : {((produit.prix - prixUnit) * totalQte).toFixed(2)} DA</span>
                  </div>
                )}
              </div>
            )}

            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 space-y-1">
                {errors.map((e, i) => <p key={i} className="text-sm text-red-600 dark:text-red-400">{e}</p>)}
              </div>
            )}

            <button onClick={handleAjouter} disabled={sending || lignes.length === 0}
              className={`w-full font-semibold py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all duration-300 text-base active:scale-[0.98] ${sent ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : lignes.length === 0 ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-default' : sending ? 'bg-orange-700 text-white opacity-70 cursor-wait' : 'bg-orange-700 hover:bg-orange-800 active:bg-orange-900 text-white shadow-lg shadow-orange-700/20'}`}
            >
              {sent ? <><Check className="w-5 h-5" /> Ajouté au panier !</>
                : sending ? <><Loader2 className="w-5 h-5 animate-spin" /> Ajout en cours…</>
                : lignes.length === 0 ? <><ShoppingBag className="w-5 h-5" /> Sélectionnez des articles</>
                : <><ShoppingCart className="w-5 h-5" /><span>Ajouter {totalQte} article{totalQte > 1 ? 's' : ''} au panier</span><span className="ml-auto text-sm font-bold opacity-90">{totalPrix.toFixed(2)} DA</span></>
              }
            </button>

            {/* Bouton vendeur desktop */}
            <VendeurButton produitId={produit.id} />
          </>
        )}

      </div>
    </div>
  )
}