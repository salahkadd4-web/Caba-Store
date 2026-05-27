import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import FavoriIconButton from '@/components/client/FavoriIconButton'
import CartIconButton from '@/components/client/CartIconButton'
import { Banknote, Package, Tag } from 'lucide-react'

type PrixTier = { minQte: number; maxQte: number | null; prix: number }

function getPrixMin(prix: number, prixVariables: unknown): number {
  const tiers = prixVariables as PrixTier[] | null
  if (!tiers || tiers.length === 0) return prix
  return Math.min(...tiers.map(t => t.prix), prix)
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const categorie = await prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        where: {
          actif: true,
          OR: [
            { vendeurId: null },
            { vendeur: { prioriteAffichage: { lt: 99 } } },
          ],
        },
        // Tri DB par date ; le tri priorité se fait en JS ci-dessous
        orderBy: [{ createdAt: 'desc' }],
        include: {
          vendeur: { select: { prioriteAffichage: true } },
          variants: {
            select: { id: true, nom: true, couleur: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  if (!categorie) notFound()

  // Tri priorité applicatif : admin (null → 0) avant vendeurs
  const produits = [...categorie.products].sort(
    (a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0)
  )

  // Count des produits actifs
  const totalActif = produits.length

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pt-4">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 mb-6">
        <Link href="/" className="hover:text-orange-700 dark:hover:text-orange-500 transition-colors">Accueil</Link>
        <span>›</span>
        <Link href="/categories" className="hover:text-orange-700 dark:hover:text-orange-500 transition-colors">Catégories</Link>
        <span>›</span>
        <span className="text-stone-800 dark:text-stone-200 font-medium">{categorie.nom}</span>
      </div>

      {/* Header catégorie */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative w-16 h-16 bg-orange-50 dark:bg-stone-800 rounded-2xl flex items-center justify-center overflow-hidden">
          {categorie.image ? (
            <Image src={categorie.image} alt={categorie.nom} fill sizes="64px" className="object-cover rounded-2xl" />
          ) : (
            <Tag className="w-7 h-7 text-orange-700 dark:text-orange-500" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">{categorie.nom}</h1>
          {categorie.description && (
            <p className="text-stone-500 dark:text-stone-400 mt-1">{categorie.description}</p>
          )}
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mt-1">
            {totalActif} produit{totalActif > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Produits */}
      {produits.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-stone-400 dark:text-stone-500" />
          </div>
          <p className="text-lg text-stone-500 dark:text-stone-400 mb-4">Aucun produit dans cette catégorie.</p>
          <Link href="/categories" className="inline-block bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors">
            ← Retour aux catégories
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {produits.map((produit) => {
            const hasTiers  = Array.isArray(produit.prixVariables) && (produit.prixVariables as PrixTier[]).length > 0
            const prixMin   = getPrixMin(produit.prix, produit.prixVariables)
            const estReduit = hasTiers && prixMin < produit.prix

            return (
              <Link
                key={produit.id}
                href={`/produits/${produit.id}`}
                className="product-card group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
              >
                {/* Image */}
                <div className="relative h-48 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
                  {produit.images[0] ? (
                    <Image
                      src={produit.images[0]}
                      alt={produit.nom}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <Package className="w-14 h-14 text-stone-300 dark:text-stone-600" />
                  )}

                  {/* Badge prix dégressif */}
                  {hasTiers && (
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] bg-orange-700 text-white font-bold px-1.5 py-0.5 rounded-full shadow"><Banknote className="w-4 h-4 inline mr-1" />{' '}dégressif
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <FavoriIconButton produitId={produit.id} />
                    <CartIconButton produitId={produit.id} stock={produit.stock} />
                  </div>
                </div>

                {/* Infos */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2 line-clamp-2">
                    {produit.nom}
                  </h3>

                  {/* Bloc prix */}
                  <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
                    {hasTiers && (
                      <span className="text-[10px] text-stone-400 dark:text-stone-500">à partir de</span>
                    )}
                    <span className={`text-lg font-bold ${estReduit ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-500'}`}>
                      {prixMin.toFixed(2)} DA
                    </span>
                    {estReduit && (
                      <>
                        <span className="text-sm text-stone-400 dark:text-stone-500 line-through font-normal">
                          {produit.prix.toFixed(2)}
                        </span>
                        <span className="text-[9px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold px-1 py-0.5 rounded-full">
                          −{Math.round((1 - prixMin / produit.prix) * 100)}%
                        </span>
                      </>
                    )}
                  </div>

                  {/* Swatches variantes */}
                  {produit.variants.length > 0 && (
                    <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                      {produit.variants.slice(0, 5).map(v =>
                        v.couleur ? (
                          <span
                            key={v.id}
                            title={v.nom}
                            className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-600 inline-block shrink-0"
                            style={{ backgroundColor: v.couleur }}
                          />
                        ) : (
                          <span
                            key={v.id}
                            className="text-[9px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded-full"
                          >
                            {v.nom}
                          </span>
                        )
                      )}
                      {produit.variants.length > 5 && (
                        <span className="text-[9px] text-stone-400">+{produit.variants.length - 5}</span>
                      )}
                    </div>
                  )}

                  {/* Stock */}
                  <p className={`text-xs ${produit.stock > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {produit.stock > 0 ? `En stock (${produit.stock})` : 'Rupture de stock'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
