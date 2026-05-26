import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import FavoriButton from '@/components/client/FavoriButton'
import FavoriIconButton from '@/components/client/FavoriIconButton'
import CartIconButton from '@/components/client/CartIconButton'
import ProduitDetailClient from '@/components/client/ProduitDetailClient'

export default async function ProduitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const produit = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: {
        orderBy: { createdAt: 'asc' },
        include: { options: { orderBy: { createdAt: 'asc' } } },
      },
    },
  })

  if (!produit || !produit.actif) notFound()

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pt-4  pb-52 md:pb-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Accueil</Link>
        <span>›</span>
        <Link href="/produits" className="hover:text-blue-600 dark:hover:text-blue-400">Produits</Link>
        <span>›</span>
        <Link href={`/categories/${produit.category.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
          {produit.category.nom}
        </Link>
        <span>›</span>
        <span className="text-gray-800 dark:text-gray-200 font-medium line-clamp-1">{produit.nom}</span>
      </div>

      {/* Catégorie + Titre */}
      <div className="mb-6">
        <Link href={`/categories/${produit.category.id}`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {produit.category.nom}
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{produit.nom}</h1>
        {produit.description && (
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-3">{produit.description}</p>
        )}
      </div>

      {/* Composant interactif : galerie + variantes + quantité + panier */}
      <ProduitDetailClient
        produit={{
          id: produit.id,
          nom: produit.nom,
          prix: produit.prix,
          stock: produit.stock,
          images: produit.images,
          prixVariables: produit.prixVariables as unknown as { minQte: number; maxQte: number | null; prix: number }[] | null,
          typeOption: produit.typeOption ?? null,
          variants: produit.variants,
        }}
      />

      {/* Favoris */}
      <div className="mt-6">
        <FavoriButton produitId={produit.id} />
      </div>

      {/* Produits similaires */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Produits similaires</h2>
        <ProduitsSimilaires categoryId={produit.category.id} produitId={produit.id} />
      </div>
    </div>
  )
}

async function ProduitsSimilaires({ categoryId, produitId }: { categoryId: string; produitId: string }) {
  const produitsRaw = await prisma.product.findMany({
    where: {
      categoryId,
      actif: true,
      NOT: { id: produitId },
      OR: [
        { vendeurId: null },
        { vendeur: { prioriteAffichage: { lt: 99 } } },
      ],
    },
    // Tri DB par date ; le tri priorité se fait en JS ci-dessous
    orderBy: [{ createdAt: 'desc' }],
    take: 8, // on prend plus pour avoir 4 après le tri
    include: {
      category: true,
      vendeur: { select: { prioriteAffichage: true } },
      variants: { select: { id: true, nom: true, couleur: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  // Tri priorité applicatif puis on limite à 4
  const produits = [...produitsRaw]
    .sort((a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0))
    .slice(0, 4)

  if (produits.length === 0) return null

  return (
    <div className="products-grid grid grid-cols-2 md:grid-cols-4 gap-6">
      {produits.map((produit) => {
        const tiers     = produit.prixVariables as { minQte: number; maxQte: number | null; prix: number }[] | null
        const hasTiers  = Array.isArray(tiers) && tiers.length > 0
        const prixMin   = hasTiers ? Math.min(...tiers!.map(t => t.prix), produit.prix) : produit.prix
        const estReduit = hasTiers && prixMin < produit.prix

        return (
          <Link
            key={produit.id}
            href={`/produits/${produit.id}`}
            className="product-card group bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            {/* Image */}
            <div className="relative h-44 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
              {produit.images[0] ? (
                <Image
                  src={produit.images[0]}
                  alt={produit.nom}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <span className="text-3xl">📦</span>
              )}

              {/* Badge dégressif */}
              {hasTiers && (
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-full shadow">
                    dégressif
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
            <div className="p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-0.5">{produit.category.nom}</p>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 mb-1.5">
                {produit.nom}
              </h3>

              {/* Bloc prix */}
              <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
                {hasTiers && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">à partir de</span>
                )}
                <span className={`text-base font-bold ${estReduit ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {prixMin.toFixed(2)} DA
                </span>
                {estReduit && (
                  <>
                    <span className="text-xs text-gray-400 line-through font-normal">
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
                <div className="flex items-center gap-1 flex-wrap">
                  {produit.variants.slice(0, 5).map(v =>
                    v.couleur ? (
                      <span
                        key={v.id}
                        title={v.nom}
                        className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600 inline-block shrink-0"
                        style={{ backgroundColor: v.couleur }}
                      />
                    ) : (
                      <span
                        key={v.id}
                        className="text-[9px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full"
                      >
                        {v.nom}
                      </span>
                    )
                  )}
                  {produit.variants.length > 5 && (
                    <span className="text-[9px] text-gray-400">+{produit.variants.length - 5}</span>
                  )}
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}