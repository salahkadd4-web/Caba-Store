'use client'

/**
 * components/client/ProductCard.tsx
 * ----------------------------------
 * Carte produit réutilisable — utilisée sur la home page, la page /produits,
 * /categories/[id], la recherche et les produits similaires.
 *
 * Variantes visuelles :
 *  - "grid"    → card verticale standard (home, /produits)
 *  - "compact" → card étroite pour scrolls horizontaux (section catégories)
 */

import Link from 'next/link'
import Image from 'next/image'
import { Children, Fragment } from 'react'
import { Banknote, Package } from 'lucide-react'
import FavoriIconButton from '@/components/client/FavoriIconButton'
import CartIconButton from '@/components/client/CartIconButton'
import { getPrixMin, hasPrixDegressif, getPourcentageReduction } from '@/lib/prix'
import { useI18n } from '@/components/I18nProvider'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductCardVariant = { id: string; nom: string; couleur: string | null }

export type ProductCardData = {
  id: string
  nom: string
  images: string[]
  prix: number
  stock: number
  prixVariables?: unknown
  variants?: ProductCardVariant[]
  category: { nom: string }
}

type Props = {
  produit: ProductCardData
  /** Badges à afficher en haut à gauche (ex: "Top vente", numéro de rang) */
  badges?: React.ReactNode
  /** Affichage compact pour les rangées horizontales */
  compact?: boolean
  /** Classes CSS additionnelles sur la card */
  className?: string
  /** Masquer les boutons favoris/panier (ex: affichage statique) */
  hideActions?: boolean
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function VariantSwatches({
  variants,
  max,
}: {
  variants: ProductCardVariant[]
  max: number
}) {
  if (variants.length === 0) return null
  return (
    <div className="flex items-center gap-1 flex-wrap mt-1.5">
      {variants.slice(0, max).map((v) =>
        v.couleur ? (
          <span
            key={v.id}
            title={v.nom}
            className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
            style={{ backgroundColor: v.couleur }}
          />
        ) : (
          <span
            key={v.id}
            className="text-xs text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded-full"
          >
            {v.nom}
          </span>
        ),
      )}
      {variants.length > max && (
        <span className="text-xs text-stone-400">+{variants.length - max}</span>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

/** Seuil sous lequel la carte signale un stock bas (« Plus que 3 »). */
const STOCK_BAS = 3

export default function ProductCard({
  produit,
  badges,
  compact = false,
  className = '',
  hideActions = false,
}: Props) {
  const { t, fmt } = useI18n()
  const hasTiers  = hasPrixDegressif(produit.prixVariables)
  const prixMin   = getPrixMin(produit.prixVariables, produit.prix)
  const reduction = getPourcentageReduction(produit.prixVariables, produit.prix)
  const estReduit = reduction !== null

  // Le stock du produit ne fait foi que sans variantes (sinon il est porté par chaque variante)
  const sansVariantes = !!produit.variants && produit.variants.length === 0
  const rupture  = sansVariantes && produit.stock === 0
  const stockBas = sansVariantes && produit.stock > 0 && produit.stock <= STOCK_BAS

  const cardWidth = compact ? 'w-40 flex-none snap-start' : ''

  return (
    <Link
      href={`/produits/${produit.id}`}
      className={`product-card group flex flex-col bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-600 transition-colors ${cardWidth} ${className}`}
    >
      {/* ── Image : case carrée, produit entier sur fond blanc ── */}
      <div className="relative aspect-square bg-white border-b border-stone-100 dark:border-stone-800 overflow-hidden">
        {produit.images[0] ? (
          <Image
            src={produit.images[0]}
            alt={produit.nom}
            fill
            sizes={
              compact
                ? '160px'
                : '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw'
            }
            className={`object-contain ${compact ? 'p-2.5' : 'p-3 md:p-4'} group-hover:scale-[1.03] transition-transform duration-300`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-50 dark:bg-stone-800">
            <Package className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} text-stone-300 dark:text-stone-600`} />
          </div>
        )}

        {/* ── Badges (rang, prix dégressif) ── */}
        {(badges || hasTiers) && (
          <div className="absolute top-2 start-2 flex flex-col items-start gap-1">
            {Children.map(badges, (child, i) => (
              <Fragment key={`badge-${i}`}>{child}</Fragment>
            ))}
            {hasTiers && (
              <span key="degressif" className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-50 text-orange-800 px-2 py-0.5 rounded-full border border-orange-100">
                <Banknote className="w-3.5 h-3.5" />
                {t.common.degressiveBadge}
              </span>
            )}
          </div>
        )}

        {/* ── Favori : seul bouton posé sur l'image ── */}
        {!hideActions && (
          <div className="absolute top-2 end-2">
            <FavoriIconButton produitId={produit.id} />
          </div>
        )}
      </div>

      {/* ── Infos ── */}
      <div className={`flex flex-col flex-1 gap-1.5 ${compact ? 'p-3' : 'p-3.5 md:p-4'}`}>
        <h3 className={`${compact ? 'text-sm' : 'text-sm md:text-[15px]'} font-medium text-stone-800 dark:text-stone-100 line-clamp-2 leading-snug min-h-[2.5em]`}>
          {produit.nom}
        </h3>

        {/* Prix */}
        <div className="flex items-baseline gap-x-2 gap-y-0.5 flex-wrap">
          {hasTiers && (
            <span className="w-full text-xs text-stone-500 dark:text-stone-400">{t.common.fromPrice}</span>
          )}
          <span className={`${compact ? 'text-base' : 'text-base md:text-lg'} font-bold tabular-nums text-stone-900 dark:text-stone-50`}>
            {fmt.price(prixMin)}
          </span>
          {estReduit && (
            <>
              <span className="text-xs text-stone-400 line-through tabular-nums">{fmt.money(produit.prix)}</span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-px rounded-full">
                −{reduction}%
              </span>
            </>
          )}
        </div>

        {produit.variants && <VariantSwatches variants={produit.variants} max={compact ? 4 : 5} />}

        {/* ── Bas de carte : signal de stock utile + ajout au panier ── */}
        {(!hideActions || rupture || stockBas) && (
          <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
            {rupture ? (
              <span className="text-xs font-medium text-red-700 dark:text-red-400">{t.common.outOfStock}</span>
            ) : stockBas ? (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{t.catalog.lowStock(produit.stock)}</span>
            ) : <span />}
            {!hideActions && <CartIconButton produitId={produit.id} stock={produit.stock} variant={compact ? 'square' : 'inline'} />}
          </div>
        )}
      </div>
    </Link>
  )
}
