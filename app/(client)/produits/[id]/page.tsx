import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import FavoriButton from '@/components/client/FavoriButton'
import FavoriIconButton from '@/components/client/FavoriIconButton'
import CartIconButton from '@/components/client/CartIconButton'
import ProduitDetailClient from '@/components/client/ProduitDetailClient'
import { Banknote, ChevronRight, Package } from 'lucide-react'

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
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 pb-52 md:pb-12">

      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="flex items-center flex-wrap gap-1 text-sm text-stone-500 dark:text-stone-400 mb-8">
        <Link href="/" className="hover:text-orange-700 dark:hover:text-orange-400 transition-colors">Accueil</Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600" />
        <Link href="/produits" className="hover:text-orange-700 dark:hover:text-orange-400 transition-colors">Produits</Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600" />
        <Link href={`/categories/${produit.category.id}`} className="hover:text-orange-700 dark:hover:text-orange-400 transition-colors">
          {produit.category.nom}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600" />
        <span className="text-stone-800 dark:text-stone-200 font-medium line-clamp-1">{produit.nom}</span>
      </nav>

      {/* Catégorie + Titre */}
      <div className="mb-8">
        <Link
          href={`/categories/${produit.category.id}`}
          className="inline-block text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400 hover:underline mb-2"
        >
          {produit.category.nom}
        </Link>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {produit.nom}
        </h1>
        {produit.description && (
          <p className="text-stone-600 dark:text-stone-400 leading-relaxed mt-4 max-w-3xl">{produit.description}</p>
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
      <section className="mt-20 pt-10 border-t border-stone-200 dark:border-stone-800">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1">Découvrir</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">Produits similaires</h2>
          </div>
          <Link
            href={`/categories/${produit.category.id}`}
            className="hidden sm:inline-flex text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
          >
            Voir la catégorie →
          </Link>
        </div>
        <ProduitsSimilaires categoryId={produit.category.id} produitId={produit.id} />
      </section>
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
            className="group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700/50 hover:shadow-md transition-all"
          >
            {/* Image */}
            <div className="relative h-44 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
              {produit.images[0] ? (
                <Image
                  src={produit.images[0]}
                  alt={produit.nom}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <Package className="w-10 h-10 text-stone-300 dark:text-stone-600" />
              )}

              {/* Badge dégressif */}
              {hasTiers && (
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 text-[10px] bg-orange-700 text-white font-semibold px-2 py-0.5 rounded-full shadow">
                    <Banknote className="w-3 h-3" /> Dégressif
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
            <div className="p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1">{produit.category.nom}</p>
              <h3 className="text-sm font-medium text-stone-800 dark:text-stone-100 line-clamp-2 mb-2">
                {produit.nom}
              </h3>

              {/* Bloc prix */}
              <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
                {hasTiers && (
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">à partir de</span>
                )}
                <span className={`text-base font-semibold ${estReduit ? 'text-green-700 dark:text-green-400' : 'text-stone-900 dark:text-stone-50'}`}>
                  {prixMin.toFixed(2)} DA
                </span>
                {estReduit && (
                  <>
                    <span className="text-xs text-stone-400 line-through font-normal">
                      {produit.prix.toFixed(2)}
                    </span>
                    <span className="text-[9px] bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 font-semibold px-1.5 py-0.5 rounded-full">
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
                        className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 inline-block shrink-0"
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
            </div>
          </Link>
        )
      })}
    </div>
  )
}