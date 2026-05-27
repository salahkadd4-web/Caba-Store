'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Tag } from 'lucide-react'

type Category = {
  id: string
  nom: string
  image: string | null
  description: string | null
  _count: { products: number }
}

export default function CategoriesCarousel({ categories }: { categories: Category[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 scrollbar-hide -mx-4 px-4">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/categories/${cat.id}`}
          className="snap-start shrink-0 w-36 bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-transparent dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-600 p-4 flex flex-col items-center text-center gap-3 transition-all duration-300"
        >
          <div className="relative w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center overflow-hidden">
            {cat.image ? (
              <Image src={cat.image} alt={cat.nom} fill sizes="56px" className="object-cover rounded-full" />
            ) : (
              <span className="text-3xl"><Tag className="w-4 h-4" /></span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {cat.nom}
            </h2>
            <p className="text-xs text-orange-700 dark:text-orange-500 mt-1 font-medium">
              {cat._count.products} produit{cat._count.products > 1 ? 's' : ''}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}