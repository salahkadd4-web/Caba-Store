import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProduitDetailClient from '@/components/client/ProduitDetailClient'
import ProductCard, { type ProductCardData } from '@/components/client/ProductCard'
import { ChevronRight } from 'lucide-react'
import { VENDEUR_SUSPENDU_PRIORITE } from '@/lib/constants'

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
          id:            produit.id,
          nom:           produit.nom,
          prix:          produit.prix,
          stock:         produit.stock,
          images:        produit.images,
          prixVariables: produit.prixVariables,
          typeOption:    produit.typeOption ?? null,
          variants:      produit.variants,
        }}
      />

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

async function ProduitsSimilaires({
  categoryId,
  produitId,
}: {
  categoryId: string
  produitId:  string
}) {
  const produitsRaw = await prisma.product.findMany({
    where: {
      categoryId,
      actif: true,
      NOT: { id: produitId },
      OR: [
        { vendeurId: null },
        { vendeur: { prioriteAffichage: { lt: VENDEUR_SUSPENDU_PRIORITE } } },
      ],
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 8,
    include: {
      category: true,
      vendeur:  { select: { prioriteAffichage: true } },
      variants: { select: { id: true, nom: true, couleur: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  const produits = [...produitsRaw]
    .sort((a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0))
    .slice(0, 4)

  if (produits.length === 0) return null

  return (
    <div className="products-grid grid grid-cols-2 md:grid-cols-4 gap-6">
      {produits.map((p) => (
        <ProductCard key={p.id} produit={p as ProductCardData} />
      ))}
    </div>
  )
}