/**
 * components/client/CategoryTile.tsx
 * -----------------------------------
 * Tuile de catégorie : aperçu de 1 à 4 produits (produit entier sur fond blanc),
 * nom et nombre de produits. Utilisée sur /categories et sur l'accueil.
 * Composant sans état : utilisable côté serveur comme côté client.
 */

import Link from 'next/link'
import Image from 'next/image'
import { Tag } from 'lucide-react'

export default function CategoryTile({
  href,
  nom,
  detail,
  images,
  compact = false,
}: {
  href: string
  nom: string
  /** Ligne secondaire, ex. « 5 produits » */
  detail?: string
  /** Images des produits à montrer (les 4 premières sont utilisées) */
  images: string[]
  /** Une seule image et un texte plus petit (rangées mobiles) */
  compact?: boolean
}) {
  const apercu = images.filter(Boolean).slice(0, compact ? 1 : 4)
  const collage = apercu.length >= 2
  const cases = collage ? [...apercu, ...Array(4 - apercu.length).fill('')].slice(0, 4) : apercu

  return (
    <Link
      href={href}
      className="group h-full flex flex-col bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
    >
      <div className={`aspect-square bg-stone-100 dark:bg-stone-800 ${collage ? 'grid grid-cols-2 gap-px' : 'grid'}`}>
        {cases.length === 0 ? (
          <div className="flex items-center justify-center bg-stone-50 dark:bg-stone-800">
            <Tag className="w-8 h-8 text-stone-300 dark:text-stone-600" />
          </div>
        ) : (
          cases.map((src, i) => (
            <div key={i} className="relative bg-white">
              {src && (
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes={collage ? '(min-width: 1024px) 12vw, 25vw' : '(min-width: 1024px) 16vw, 33vw'}
                  className={`object-contain ${collage ? 'p-2' : 'p-3'} group-hover:scale-[1.03] transition-transform duration-300`}
                />
              )}
            </div>
          ))
        )}
      </div>
      <div className={compact ? 'px-2.5 py-2' : 'px-3.5 py-3'}>
        <p className={`${compact ? 'text-xs' : 'text-sm md:text-[15px]'} font-medium text-stone-800 dark:text-stone-100 line-clamp-3 leading-snug break-words hyphens-auto`}>{nom}</p>
        {detail && !compact && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{detail}</p>}
      </div>
    </Link>
  )
}
