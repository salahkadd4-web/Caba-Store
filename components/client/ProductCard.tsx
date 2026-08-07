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
            className="text-[9px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded-full"
          >
            {v.nom}
          </span>
        ),
      )}
      {variants.length > max && (
        <span className="text-[9px] text-stone-400">+{variants.length - max}</span>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ProductCard({
  produit,
  badges,
  compact = false,
  className = '',
  hideActions = false,
}: Props) {
  const hasTiers  = hasPrixDegressif(produit.prixVariables)
  const prixMin   = getPrixMin(produit.prixVariables, produit.prix)
  const reduction = getPourcentageReduction(produit.prixVariables, produit.prix)
  const estReduit = reduction !== null

  const imageHeight = compact ? 'h-40' : 'h-48'
  const cardWidth   = compact ? 'w-40 flex-none snap-start' : ''

  return (
    <Link
      href={`/produits/${produit.id}`}
      className={`product-card group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors ${cardWidth} ${className}`}
    >
      {/* ── Image ── */}
      <div className={`relative ${imageHeight} bg-stone-100 dark:bg-stone-800 overflow-hidden`}>
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
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package
              className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} text-stone-300 dark:text-stone-600`}
            />
          </div>
        )}

        {/* ── Badges gauche ── */}
        {(badges || hasTiers) && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {Children.map(badges, (child, i) => (
              <Fragment key={`badge-${i}`}>{child}</Fragment>
            ))}
            {hasTiers && (
              <span key="degressif" className="inline-flex items-center gap-1 text-[10px] bg-orange-700 text-white font-bold px-1.5 py-0.5 rounded-full shadow">
                <Banknote className="w-3 h-3" />
                dégressif
              </span>
            )}
          </div>
        )}

        {/* ── Actions droite ── */}
        {!hideActions && (
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <FavoriIconButton produitId={produit.id} />
            <CartIconButton produitId={produit.id} stock={produit.stock} />
          </div>
        )}
      </div>

      {/* ── Infos ── */}
      <div className={compact ? 'p-3' : 'p-4'}>
        <p
          className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-1`}
        >
          {produit.category.nom}
        </p>
        <h3
          className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-stone-800 dark:text-stone-100 line-clamp-2 mb-1.5 leading-tight`}
        >
          {produit.nom}
        </h3>

        {/* Prix */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {hasTiers && (
            <span className="text-[10px] text-stone-400 dark:text-stone-500">
              à partir de
            </span>
          )}
          <span
            className={`${compact ? 'text-sm' : 'text-base'} font-bold ${
              estReduit
                ? 'text-green-700 dark:text-green-400'
                : 'text-orange-700 dark:text-orange-500'
            }`}
          >
            {prixMin.toFixed(2)} DA
          </span>
          {estReduit && (
            <>
              <span className="text-xs text-stone-400 line-through font-normal">
                {produit.prix.toFixed(2)}
              </span>
              <span className="text-[9px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold px-1 py-0.5 rounded-full">
                −{reduction}%
              </span>
            </>
          )}
        </div>

        {/* Swatches */}
        {produit.variants && (
          <VariantSwatches variants={produit.variants} max={compact ? 4 : 5} />
        )}
      </div>
    </Link>
  )
}
