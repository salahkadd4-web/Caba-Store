// app/(client)/categories/page.tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Banknote, Package, Tag } from 'lucide-react'

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
        include: {
          vendeur: { select: { prioriteAffichage: true } },
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        Catégories
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Parcourez nos catégories de produits
      </p>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400 dark:text-gray-500">
          <Tag className="w-14 h-14 mb-4" />
          <p className="text-lg">Aucune catégorie disponible pour le moment.</p>
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
                      <img
                        src={cat.image}
                        alt={cat.nom}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Tag className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-wide">
                      {cat.nom}
                    </h2>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {cat._count.products} produit{cat._count.products > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Link
                    href={`/categories/${cat.id}`}
                    className="voir-tout-link text-xs uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
                  >
                    Voir tout →
                  </Link>
                </div>

                {/* ── Ligne de produits scrollable ── */}
                <div className="products-row flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
                  {produitsTries.map((produit) => {
                    const tiers    = produit.prixVariables as { minQte: number; maxQte: number | null; prix: number }[] | null
                    const hasTiers = Array.isArray(tiers) && tiers.length > 0
                    const prixMin  = hasTiers
                      ? Math.min(...tiers!.map((t) => t.prix), produit.prix)
                      : produit.prix
                    const estReduit = hasTiers && prixMin < produit.prix

                    return (
                      <Link
                        key={produit.id}
                        href={`/produits/${produit.id}`}
                        className="product-card group flex-none w-40 bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-transparent dark:border-gray-700 snap-start"
                      >
                        {/* Image */}
                        <div className="relative h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          {produit.images[0] ? (
                            <img
                              src={produit.images[0]}
                              alt={produit.nom}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            </div>
                          )}
                          {hasTiers && (
                            <div className="absolute top-1.5 left-1.5">
                              <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                                <Banknote className="w-3 h-3 inline mr-0.5" />
                                dégressif
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Infos */}
                        <div className="p-3">
                          <p className="text-xs font-semibold text-gray-800 dark:text-white line-clamp-2 mb-1.5 leading-tight">
                            {produit.nom}
                          </p>
                          <div className="flex items-baseline gap-1 flex-wrap">
                            {hasTiers && (
                              <span className="text-[9px] text-gray-400">à partir de</span>
                            )}
                            <span
                              className={`text-sm font-bold ${
                                estReduit
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {prixMin.toFixed(2)} DA
                            </span>
                            {estReduit && (
                              <span className="text-[9px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold px-1 py-0.5 rounded-full">
                                −{Math.round((1 - prixMin / produit.prix) * 100)}%
                              </span>
                            )}
                          </div>

                          {/* Swatches variantes */}
                          {produit.variants.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1.5">
                              {produit.variants.slice(0, 4).map((v) =>
                                v.couleur ? (
                                  <span
                                    key={v.id}
                                    title={v.nom}
                                    className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shrink-0"
                                    style={{ backgroundColor: v.couleur }}
                                  />
                                ) : (
                                  <span
                                    key={v.id}
                                    className="text-[8px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded-full"
                                  >
                                    {v.nom}
                                  </span>
                                )
                              )}
                              {produit.variants.length > 4 && (
                                <span className="text-[8px] text-gray-400">
                                  +{produit.variants.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}