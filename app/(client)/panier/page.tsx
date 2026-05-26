'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShoppingCart, X, Minus, Plus, TrendingDown,
  Ruler, Package, ArrowLeft,
  Trash2, ShoppingBag, Tag, ChevronDown, ChevronUp,
  Pencil, Check, Loader2,
} from 'lucide-react'

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
type VariantOption = { id: string; valeur: string; stock: number }
type Variant = {
  id: string; nom: string; couleur: string | null
  stock: number; images: string[]
  options: VariantOption[]
}
type PrixTier = { minQte: number; maxQte: number | null; prix: number }

type CartItem = {
  id: string
  quantite: number
  variant:       Variant | null
  variantOption: VariantOption | null
  product: {
    id: string; nom: string; prix: number
    prixVariables: PrixTier[] | null
    images: string[]; stock: number
    typeOption: string | null
    category: { nom: string }
    variants: Variant[]
  }
}

type Cart = { id: string; items: CartItem[] }

type ProductGroup = {
  product: CartItem['product']
  items:   CartItem[]
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function getPrixUnitaire(product: CartItem['product'], qte: number): number {
  if (!product.prixVariables?.length) return product.prix
  const sorted = [...product.prixVariables].sort((a, b) => b.minQte - a.minQte)
  for (const t of sorted) { if (qte >= t.minQte) return t.prix }
  return product.prix
}

function groupByProduct(items: CartItem[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>()
  for (const item of items) {
    const pid = item.product.id
    if (!map.has(pid)) map.set(pid, { product: item.product, items: [] })
    map.get(pid)!.items.push(item)
  }
  return [...map.values()]
}

/* ══════════════════════════════════════════
   QteInput — saisie libre + stepper
══════════════════════════════════════════ */
function QteInput({
  value, stockMax, onChange, onZero, size = 'md', disabled = false,
}: {
  value:    number
  stockMax: number
  onChange: (v: number) => void
  onZero?:  () => void
  size?:    'sm' | 'md'
  disabled?: boolean
}) {
  const [raw, setRaw] = useState(String(value))
  const ref           = useRef<HTMLInputElement>(null)
  const focused       = () => document.activeElement === ref.current

  const prev = useRef(value)
  if (prev.current !== value && !focused()) { prev.current = value; setRaw(String(value)) }

  const commit = (s: string) => {
    const n = parseInt(s, 10)
    if (isNaN(n) || n <= 0) { if (onZero) { onZero(); return } setRaw('1'); onChange(1); return }
    const c = Math.min(n, stockMax); setRaw(String(c)); onChange(c)
  }

  const isSm = size === 'sm'
  return (
    <div className="flex items-center gap-1">
      <button type="button" tabIndex={-1} disabled={disabled || value <= 1}
        onClick={() => { if (value - 1 <= 0 && onZero) { onZero(); return } const n = value - 1; setRaw(String(n)); onChange(n) }}
        className={`flex items-center justify-center rounded-md disabled:opacity-30 transition ${isSm ? 'w-6 h-6 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400' : 'w-8 h-8 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
        <Minus className={isSm ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
      </button>
      <input ref={ref} type="number" min={1} max={stockMax} value={raw} disabled={disabled}
        onChange={e => setRaw(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { commit(raw); ref.current?.blur() } }}
        onFocus={e => e.target.select()}
        className={`text-center font-bold tabular-nums bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none transition ${isSm ? 'w-10 text-sm py-0.5' : 'w-14 text-sm py-1.5'}`}
      />
      <button type="button" tabIndex={-1} disabled={disabled || value >= stockMax}
        onClick={() => { const n = Math.min(stockMax, value + 1); setRaw(String(n)); onChange(n) }}
        className={`flex items-center justify-center rounded-md disabled:opacity-30 transition ${isSm ? 'w-6 h-6 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400' : 'w-8 h-8 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
        <Plus className={isSm ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════
   PANNEAU ÉDITEUR
══════════════════════════════════════════ */
function ProductEditor({
  group,
  onUpdate,
  onDelete,
  onAddNew,
}: {
  group:    ProductGroup
  onUpdate: (itemId: string, quantite: number) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
  onAddNew: (productId: string, variantId: string, optionId: string | undefined, qte: number) => Promise<void>
}) {
  const { product, items } = group
  const typeOpt    = product.typeOption || 'Taille'
  const hasOptions = product.variants.some(v => v.options.length > 0)
  const isColor    = product.variants.some(v => v.couleur)

  // ── Quantité TOTALE du groupe (pour le palier dégressif correct) ──
  const totalQteGroupe = items.reduce((s, i) => s + i.quantite, 0)

  const [activeVId, setActiveVId] = useState<string>(
    items[0]?.variant?.id ?? product.variants[0]?.id ?? ''
  )
  const activeVariant = product.variants.find(v => v.id === activeVId) ?? null

  const [imgPreview, setImgPreview] = useState<string | null>(
    items[0]?.variant?.images?.[0] ?? product.images?.[0] ?? null
  )

  const [pending, setPending] = useState<Record<string, boolean>>({})

  const findItem = (variantId: string, optionId?: string) =>
    items.find(i =>
      i.variant?.id === variantId &&
      (optionId ? i.variantOption?.id === optionId : !i.variantOption)
    ) ?? null

  const qteInCart = (variantId: string, optionId?: string) =>
    findItem(variantId, optionId)?.quantite ?? 0

  const handleChange = async (variantId: string, optionId: string | undefined, newQte: number) => {
    const existing = findItem(variantId, optionId)
    const key = `${variantId}__${optionId ?? ''}`
    setPending(p => ({ ...p, [key]: true }))
    if (existing) {
      if (newQte === 0) await onDelete(existing.id)
      else await onUpdate(existing.id, newQte)
    } else if (newQte > 0) {
      await onAddNew(product.id, variantId, optionId, newQte)
    }
    setPending(p => ({ ...p, [key]: false }))
  }

  return (
    <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-100 dark:border-gray-800">

      {/* Image + swatches couleur */}
      <div className="flex gap-3">
        <div className="relative w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
          {imgPreview
            ? <Image src={imgPreview} alt="" fill sizes="80px" className="object-cover" />
            : <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          }
        </div>

        <div className="flex-1">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            {isColor ? 'Couleur' : 'Variante'}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map(v => {
              const isActive   = v.id === activeVId
              const qteV       = hasOptions
                ? v.options.reduce((s, o) => s + qteInCart(v.id, o.id), 0)
                : qteInCart(v.id)
              const outOfStock = hasOptions
                ? v.options.every(o => o.stock === 0)
                : v.stock === 0

              return (
                <button key={v.id} type="button"
                  onClick={() => { if (outOfStock) return; setActiveVId(v.id); setImgPreview(v.images?.[0] ?? product.images?.[0] ?? null) }}
                  disabled={outOfStock}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    isActive
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm'
                      : outOfStock
                        ? 'border-gray-200 dark:border-gray-700 opacity-30 cursor-not-allowed'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}>
                  {v.couleur && (
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-500 shrink-0 shadow-sm"
                      style={{ backgroundColor: v.couleur }} />
                  )}
                  {v.nom}
                  {qteV > 0 && (
                    <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                      {qteV}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Options (tailles) de la variante active */}
      {activeVariant && (
        <div>
          {hasOptions ? (
            <>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Ruler className="w-3 h-3" /> {typeOpt}
                <span className="font-normal normal-case text-gray-400 ml-1">— cliquez pour ajouter, tapez la quantité</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {activeVariant.options.map(opt => {
                  const key       = `${activeVariant.id}__${opt.id}`
                  const qt        = qteInCart(activeVariant.id, opt.id)
                  const isPending = pending[key]
                  const outStock  = opt.stock === 0
                  const maxReach  = qt >= opt.stock

                  return (
                    <div key={opt.id}
                      className={`relative flex items-center rounded-xl border-2 overflow-hidden text-sm transition-all ${
                        outStock
                          ? 'border-gray-200 dark:border-gray-700 opacity-30 cursor-not-allowed'
                          : qt > 0
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/50 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}>
                      <button type="button"
                        onClick={() => !outStock && qt === 0 && handleChange(activeVariant.id, opt.id, 1)}
                        disabled={outStock || (qt > 0)}
                        className={`min-w-10 px-3 h-9 flex items-center justify-center font-semibold transition-all ${
                          outStock ? 'cursor-not-allowed line-through text-gray-400' : qt > 0 ? 'cursor-default text-blue-700 dark:text-blue-300' : 'cursor-pointer text-gray-700 dark:text-gray-200'
                        }`}>
                        {opt.valeur}
                      </button>
                      {qt > 0 && (
                        <div className="pr-1.5 flex items-center gap-1">
                          {isPending
                            ? <Loader2 className="w-4 h-4 animate-spin text-blue-500 mx-2" />
                            : <QteInput size="sm" value={qt} stockMax={opt.stock}
                                onChange={v => handleChange(activeVariant.id, opt.id, v)}
                                onZero={() => handleChange(activeVariant.id, opt.id, 0)}
                              />
                          }
                        </div>
                      )}
                      {maxReach && qt > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1 rounded-full shadow leading-tight">MAX</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Quantité</p>
              {pending[`${activeVariant.id}__`]
                ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                : <QteInput
                    value={qteInCart(activeVariant.id)}
                    stockMax={activeVariant.stock}
                    onChange={v => handleChange(activeVariant.id, undefined, v)}
                    onZero={() => handleChange(activeVariant.id, undefined, 0)}
                  />
              }
              <span className="text-xs text-gray-400">{activeVariant.stock} dispo.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Récap lignes — prix basé sur la quantité TOTALE du groupe ── */}
      {items.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 pt-2.5 pb-1.5">
            Dans votre panier
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map(item => {
              // ✅ Prix calculé sur la quantité TOTALE du groupe, pas item.quantite
              const prixU = getPrixUnitaire(item.product, totalQteGroupe)
              const key   = `${item.variant?.id ?? ''}__${item.variantOption?.id ?? ''}`
              return (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2">
                  {item.variant?.couleur && (
                    <span className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shrink-0"
                      style={{ backgroundColor: item.variant.couleur }} />
                  )}
                  <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">
                    {item.variant?.nom ?? ''}
                    {item.variantOption && ` / ${typeOpt} ${item.variantOption.valeur}`}
                  </span>
                  {pending[key]
                    ? <Loader2 className="w-4 h-4 animate-spin text-blue-500 mx-2" />
                    : <QteInput size="sm" value={item.quantite}
                        stockMax={item.variantOption?.stock ?? item.variant?.stock ?? item.product.stock}
                        onChange={v => handleChange(item.variant?.id ?? '', item.variantOption?.id, v)}
                        onZero={() => handleChange(item.variant?.id ?? '', item.variantOption?.id, 0)}
                      />
                  }
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-20 text-right tabular-nums shrink-0">
                    {(prixU * item.quantite).toFixed(2)} DA
                  </span>
                  <button type="button" onClick={() => onDelete(item.id)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition shrink-0 p-0.5 rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   PRODUCT CARD (collapsed + expanded)
══════════════════════════════════════════ */
function ProductCard({
  group, onUpdate, onDelete, onAddNew, onDeleteGroup,
}: {
  group:         ProductGroup
  onUpdate:      (id: string, q: number) => Promise<void>
  onDelete:      (id: string) => Promise<void>
  onAddNew:      (pid: string, vid: string, oid: string | undefined, q: number) => Promise<void>
  onDeleteGroup: (items: CartItem[]) => Promise<void>
}) {
  const { product, items } = group
  const [open, setOpen] = useState(false)
  const typeOpt = product.typeOption || 'Taille'

  const totalQte = items.reduce((s, i) => s + i.quantite, 0)
  const prixUnit = getPrixUnitaire(product, totalQte)
  const prixBase = product.prix
  const isReduit = (product.prixVariables?.length ?? 0) > 0 && prixUnit < prixBase
  const sousTotal = prixUnit * totalQte
  const economie  = isReduit ? (prixBase - prixUnit) * totalQte : 0

  const mainImg = items.find(i => i.variant?.images?.length)?.variant?.images[0]
    ?? product.images?.[0] ?? null

  // Prochain palier
  const tiers = [...(product.prixVariables ?? [])].sort((a, b) => a.minQte - b.minQte)
  const prochainPalier = tiers.find(t => t.minQte > totalQte) ?? null

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all duration-200 ${open ? 'border-blue-300 dark:border-blue-700 shadow-md shadow-blue-500/5' : 'border-gray-100 dark:border-gray-800 hover:shadow-sm'}`}>

      {/* ── EN-TÊTE ── */}
      <div className="flex gap-3 p-4">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative">
          {mainImg
            ? <Image src={mainImg} alt={product.nom} fill sizes="80px" className="object-cover" />
            : <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          }
          {items.filter(i => i.variant?.couleur).slice(0, 3).map((i, idx) => (
            <span key={i.id}
              className="absolute bottom-1 border-2 border-white dark:border-gray-900 rounded-full shadow-sm w-4 h-4"
              style={{ right: `${4 + idx * 10}px`, backgroundColor: i.variant!.couleur! }} />
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mb-0.5 truncate">{product.category.nom}</p>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-2">{product.nom}</h3>
            </div>
            <button type="button" onClick={() => onDeleteGroup(items)}
              title="Retirer ce produit"
              className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition p-1 shrink-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Chips variantes */}
          <div className="flex flex-wrap gap-1 mt-2">
            {items.map(item => (
              <span key={item.id}
                className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] px-2 py-0.5 rounded-full">
                {item.variant?.couleur && (
                  <span className="w-2.5 h-2.5 rounded-full border border-gray-300 dark:border-gray-600 shrink-0"
                    style={{ backgroundColor: item.variant.couleur }} />
                )}
                {item.variant?.nom ?? product.nom}
                {item.variantOption && <> · {typeOpt} {item.variantOption.valeur}</>}
                <span className="font-bold text-gray-500 dark:text-gray-400 ml-0.5">×{item.quantite}</span>
              </span>
            ))}
          </div>

          {/* Prix unitaire */}
          <div className="flex items-baseline gap-2 mt-2.5 flex-wrap">
            <span className={`text-base font-bold ${isReduit ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
              {prixUnit.toFixed(2)} DA<span className="text-xs font-normal text-gray-400 ml-0.5">/u.</span>
            </span>
            {isReduit && (
              <>
                <span className="text-xs text-gray-400 line-through">{prixBase.toFixed(2)} DA</span>
                <span className="text-[10px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingDown className="w-2.5 h-2.5" />−{Math.round((1 - prixUnit / prixBase) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Incitation palier suivant */}
          {prochainPalier && (
            <p className="text-[11px] text-blue-500 dark:text-blue-400 flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 shrink-0" />
              +{prochainPalier.minQte - totalQte} art. → {prochainPalier.prix.toFixed(2)} DA/u.
            </p>
          )}
        </div>
      </div>

      {/* ── ÉDITEUR ── */}
      {open && (
        <ProductEditor
          group={group}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddNew={onAddNew}
        />
      )}

      {/* ── FOOTER ── */}
      <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 px-4 py-2.5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
            Sous-total — {totalQte} art.{isReduit && economie > 0 && ` · éco. ${economie.toFixed(0)} DA`}
          </p>
          <div className="flex items-baseline gap-1.5">
            <p className="font-bold text-gray-800 dark:text-gray-100">{sousTotal.toFixed(2)} DA</p>
            {isReduit && <p className="text-[10px] text-gray-400 line-through">{(prixBase * totalQte).toFixed(2)} DA</p>}
          </div>
        </div>

        <button type="button"
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border-2 transition-all active:scale-95 ${
            open
              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
          }`}>
          {open
            ? <><ChevronUp className="w-3.5 h-3.5" /> Fermer</>
            : <><Pencil className="w-3.5 h-3.5" /> Modifier la sélection <ChevronDown className="w-3.5 h-3.5" /></>
          }
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   PAGE PANIER
══════════════════════════════════════════ */
export default function PanierPage() {
  const [panier,  setPanier]  = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const fetchPanier = useCallback(async () => {
    try { const r = await fetch('/api/panier'); setPanier(await r.json()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPanier() }, [fetchPanier])

  const updateQuantite = async (itemId: string, quantite: number) => {
    await fetch(`/api/panier/${itemId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantite }),
    })
    await fetchPanier()
  }

  const supprimerItem = async (itemId: string) => {
    await fetch(`/api/panier/${itemId}`, { method: 'DELETE' })
    await fetchPanier()
  }

  const supprimerGroupe = async (items: CartItem[]) => {
    await Promise.all(items.map(i => fetch(`/api/panier/${i.id}`, { method: 'DELETE' })))
    await fetchPanier()
  }

  const ajouterItem = async (productId: string, variantId: string, optionId: string | undefined, quantite: number) => {
    await fetch('/api/panier', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produitId: productId, variantId, variantOptionId: optionId, quantite }),
    })
    await fetchPanier()
  }

  const viderPanier = async () => {
    if (!panier) return
    setDeleting(true)
    await Promise.all(panier.items.map(i => fetch(`/api/panier/${i.id}`, { method: 'DELETE' })))
    await fetchPanier()
    setDeleting(false)
  }

  const groups = panier ? groupByProduct(panier.items) : []

  // ── Calculs globaux (quantité totale par produit pour le bon palier) ──
  const sousTotal = groups.reduce((s, g) => {
    const qte   = g.items.reduce((a, i) => a + i.quantite, 0)
    const prixU = getPrixUnitaire(g.product, qte)
    return s + prixU * qte
  }, 0)
  const totalEconomies = groups.reduce((s, g) => {
    const qte   = g.items.reduce((a, i) => a + i.quantite, 0)
    const prixU = getPrixUnitaire(g.product, qte)
    const base  = g.product.prix
    return s + (prixU < base ? (base - prixU) * qte : 0)
  }, 0)
  const totalArticles = panier?.items.reduce((s, i) => s + i.quantite, 0) ?? 0

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
      Chargement du panier…
    </div>
  )

  if (!panier || panier.items.length === 0) return (
    <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center">
        <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Votre panier est vide</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-xs">Ajoutez des produits pour commencer vos achats.</p>
      <Link href="/produits"
        className="mt-2 inline-flex items-center gap-2 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black font-semibold px-8 py-3 rounded-xl transition">
        <ShoppingBag className="w-4 h-4" /> Découvrir les produits
      </Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" />
          Mon Panier
          <span className="text-base font-normal text-gray-400 ml-1">
            ({groups.length} produit{groups.length > 1 ? 's' : ''} · {totalArticles} art.)
          </span>
        </h1>
        <button onClick={viderPanier} disabled={deleting}
          className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1 disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" />
          {deleting ? 'Vidage…' : 'Vider le panier'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Cartes produits ── */}
        <div className="lg:col-span-2 space-y-3">
          {groups.map(group => (
            <ProductCard
              key={group.product.id}
              group={group}
              onUpdate={updateQuantite}
              onDelete={supprimerItem}
              onAddNew={ajouterItem}
              onDeleteGroup={supprimerGroupe}
            />
          ))}
          <Link href="/produits"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition mt-1">
            <ArrowLeft className="w-4 h-4" /> Continuer les achats
          </Link>
        </div>

        {/* ── Résumé ── */}
        <div className="lg:sticky lg:top-20 h-fit space-y-3">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Résumé</h2>

            <div className="space-y-2.5 mb-4 max-h-52 overflow-y-auto pr-1">
              {groups.map(group => {
                const qte   = group.items.reduce((s, i) => s + i.quantite, 0)
                const prixU = getPrixUnitaire(group.product, qte)
                return (
                  <div key={group.product.id} className="space-y-0.5">
                    <div className="flex justify-between items-start gap-2 text-xs">
                      <span className="text-gray-700 dark:text-gray-300 font-medium flex-1 line-clamp-1">{group.product.nom}</span>
                      <span className="text-gray-800 dark:text-gray-200 font-bold shrink-0 tabular-nums">
                        {(prixU * qte).toFixed(2)} DA
                      </span>
                    </div>
                    {group.items.map(item => (
                      <div key={item.id} className="flex justify-between text-[11px] text-gray-400 pl-2">
                        <span className="flex items-center gap-1 flex-wrap">
                          {item.variant?.couleur && (
                            <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block shrink-0"
                              style={{ backgroundColor: item.variant.couleur }} />
                          )}
                          {item.variant?.nom}
                          {item.variantOption && ` / ${item.variantOption.valeur}`}
                          {' '}×{item.quantite}
                        </span>
                        {/* ✅ Prix dans le résumé aussi basé sur la qte totale du groupe */}
                        <span className="tabular-nums shrink-0">
                          {(prixU * item.quantite).toFixed(2)} DA
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2.5">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Sous-total</span>
                <span className="tabular-nums">{sousTotal.toFixed(2)} DA</span>
              </div>
              {totalEconomies > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Réductions</span>
                  <span className="tabular-nums font-semibold">−{totalEconomies.toFixed(2)} DA</span>
                </div>
              )}
              <p className="text-xs text-gray-400">+ Livraison calculée à l&apos;étape suivante</p>
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-gray-100 dark:border-gray-800">
                <span className="text-gray-800 dark:text-gray-100">Total articles</span>
                <span className="text-blue-600 dark:text-blue-400 tabular-nums">{sousTotal.toFixed(2)} DA</span>
              </div>
            </div>
          </div>

          {totalEconomies > 0 && (
            <div className="bg-green-50 dark:bg-green-950/50 border border-green-100 dark:border-green-900 rounded-xl px-4 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-green-700 dark:text-green-400">Vous économisez !</p>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">{totalEconomies.toFixed(2)} DA</p>
              </div>
            </div>
          )}

          <Link href="/commandes/nouveau"
            className="flex items-center justify-center gap-2 w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black font-semibold py-4 rounded-xl transition text-base shadow-lg shadow-black/10">
            <ShoppingBag className="w-5 h-5" /> Passer la commande
          </Link>
        </div>

      </div>
    </div>
  )
}