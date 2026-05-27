// app/(client)/categories/page.tsx
import Link from 'next/link'

export const revalidate = 60
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { Tag } from 'lucide-react'
import ProductCard from '@/components/client/ProductCard'

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { products: { some: { actif: true } } },
    orderBy: { nom: 'asc' },
    include: {
      products: {
        where: {
          actif: true,
          OR: [
            { vendeurId: null },
            { vendeur: { prioriteAffichage: { lt: 99 } } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 10,
        select: {
          id: true,
          nom: true,
          images: true,
          prix: true,
          stock: true,
          prixVariables: true,
          vendeur: { select: { prioriteAffichage: true } },
          category: { select: { nom: true } },
          variants: {
            select: { id: true, couleur: true, nom: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      _count: { select: { products: { where: { actif: true } } } },
    },
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pt-4">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
        Catégories
      </h1>
      <p className="text-stone-500 dark:text-stone-400 mb-8">
        Parcourez nos catégories de produits
      </p>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-4">
            <Tag className="w-10 h-10 text-stone-400 dark:text-stone-500" />
          </div>
          <p className="text-lg text-stone-500 dark:text-stone-400">Aucune catégorie disponible pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-14">
          {categories.map((cat) => {
            // Tri priorité : null (admin) → 0, vendeurs → leur niveau
            const produitsTries = [...cat.products].sort(
              (a, b) =>
                (a.vendeur?.prioriteAffichage ?? 0) -
                (b.vendeur?.prioriteAffichage ?? 0)
            )

            return (
              <div key={cat.id}>
                {/* ── En-tête catégorie ── */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.nom}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                        <Tag className="w-4 h-4 text-stone-400" />
                      </div>
                    )}
                    <h2 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                      {cat.nom}
                    </h2>
                    <span className="text-xs text-stone-400 dark:text-stone-500">
                      {cat._count.products} produit{cat._count.products > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Link
                    href={`/categories/${cat.id}`}
                    className="text-xs uppercase tracking-[0.15em] text-orange-700 dark:text-orange-500 hover:text-orange-800 dark:hover:text-orange-400 transition-colors"
                  >
                    Voir tout →
                  </Link>
                </div>

                {/* ── Ligne de produits scrollable ── */}
                <div className="products-row flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
                  {produitsTries.map((produit) => (
                    <ProductCard key={produit.id} produit={produit} compact />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
