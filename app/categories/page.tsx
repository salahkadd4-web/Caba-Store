// app/(client)/categories/page.tsx

export const revalidate = 60
import { prisma } from '@/lib/prisma'
import { Tag } from 'lucide-react'
import CategoryTile from '@/components/client/CategoryTile'
import { PRODUIT_VISIBLE } from '@/lib/product-visibility'
import { getI18n } from '@/lib/i18n/server'
import { rankProducts, VENDEUR_RANK_SELECT } from '@/lib/product-ranking'
import { getViewerWilaya } from '@/lib/viewer'

export default async function CategoriesPage() {
  const [{ t }, viewerWilaya] = await Promise.all([getI18n(), getViewerWilaya()])
  const c = t.catalog.categories
  const categories = await prisma.category.findMany({
    where: { products: { some: PRODUIT_VISIBLE } },
    orderBy: { nom: 'asc' },
    include: {
      products: {
        where: PRODUIT_VISIBLE,
        orderBy: [{ createdAt: 'desc' }],
        // Assez de produits pour que le classement choisisse un bon aperçu
        take: 12,
        select: {
          id: true,
          images: true,
          createdAt: true,
          vendeur: VENDEUR_RANK_SELECT,
        },
      },
      _count: { select: { products: { where: PRODUIT_VISIBLE } } },
    },
  })

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 pt-6 md:pt-10 pb-24 md:pb-16">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          {c.title}
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">{c.subtitle}</p>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-4">
            <Tag className="w-10 h-10 text-stone-400 dark:text-stone-500" />
          </div>
          <p className="text-lg text-stone-500 dark:text-stone-400">{c.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {categories.map((cat) => {
            // Aperçu : les produits les mieux classés (abonnement → wilaya du visiteur → date)
            const apercu = rankProducts(cat.products, viewerWilaya).slice(0, 4).map(p => p.images[0])
            return (
              <CategoryTile
                key={cat.id}
                href={`/categories/${cat.id}`}
                nom={cat.nom}
                detail={c.productsCount(cat._count.products)}
                images={apercu}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
