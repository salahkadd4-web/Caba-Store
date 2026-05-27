// app/(client)/categories/page.tsx
import Link from 'next/link'
import Image from 'next/image'
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
                        className="product-card group flex-none w-40 bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 hover:border-orange-300 dark:hover:border-orange-700 snap-start transition-colors"
                      >
                        {/* Image */}
                        <div className="relative h-40 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          {produit.images[0] ? (
                            <Image
                              src={produit.images[0]}
                              alt={produit.nom}
                              fill
                              sizes="160px"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-10 h-10 text-stone-300 dark:text-stone-600" />
                            </div>
                          )}
                          {hasTiers && (
                            <div className="absolute top-1.5 left-1.5">
                              <span className="text-[9px] bg-orange-700 text-white font-bold px-1.5 py-0.5 rounded-full">
                                <Banknote className="w-3 h-3 inline mr-0.5" />
                                dégressif
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Infos */}
                        <div className="p-3">
                          <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 line-clamp-2 mb-1.5 leading-tight">
                            {produit.nom}
                          </p>
                          <div className="flex items-baseline gap-1 flex-wrap">
                            {hasTiers && (
                              <span className="text-[9px] text-stone-400">à partir de</span>
                            )}
                            <span
                              className={`text-sm font-bold ${
                                estReduit
                                  ? 'text-green-700 dark:text-green-400'
                                  : 'text-orange-700 dark:text-orange-500'
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
                                    className="w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                                    style={{ backgroundColor: v.couleur }}
                                  />
                                ) : (
                                  <span
                                    key={v.id}
                                    className="text-[8px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded-full"
                                  >
                                    {v.nom}
                                  </span>
                                )
                              )}
                              {produit.variants.length > 4 && (
                                <span className="text-[8px] text-stone-400">
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
