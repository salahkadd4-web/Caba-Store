import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProductCard, { type ProductCardData } from '@/components/client/ProductCard'
import { Package, Tag } from 'lucide-react'
import { VENDEUR_SUSPENDU_PRIORITE } from '@/lib/constants'

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
            { vendeur: { prioriteAffichage: { lt: VENDEUR_SUSPENDU_PRIORITE } } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }],
        include: {
          vendeur:  { select: { prioriteAffichage: true } },
          variants: { select: { id: true, nom: true, couleur: true }, orderBy: { createdAt: 'asc' } },
        },
      },
    },
  })

  if (!categorie) notFound()

  const produits = [...categorie.products].sort(
    (a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0),
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pt-4">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 mb-6">
        <Link href="/" className="hover:text-orange-700 dark:hover:text-orange-500 transition-colors">
          Accueil
        </Link>
        <span>›</span>
        <Link href="/categories" className="hover:text-orange-700 dark:hover:text-orange-500 transition-colors">
          Catégories
        </Link>
        <span>›</span>
        <span className="text-stone-800 dark:text-stone-200 font-medium">{categorie.nom}</span>
      </div>

      {/* Header catégorie */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative w-16 h-16 bg-orange-50 dark:bg-stone-800 rounded-2xl flex items-center justify-center overflow-hidden">
          {categorie.image ? (
            <Image
              src={categorie.image}
              alt={categorie.nom}
              fill
              sizes="64px"
              className="object-cover rounded-2xl"
            />
          ) : (
            <Tag className="w-7 h-7 text-orange-700 dark:text-orange-500" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {categorie.nom}
          </h1>
          {categorie.description && (
            <p className="text-stone-500 dark:text-stone-400 mt-1">{categorie.description}</p>
          )}
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mt-1">
            {produits.length} produit{produits.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Produits */}
      {produits.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-stone-400 dark:text-stone-500" />
          </div>
          <p className="text-lg text-stone-500 dark:text-stone-400 mb-4">
            Aucun produit dans cette catégorie.
          </p>
          <Link
            href="/categories"
            className="inline-block bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            ← Retour aux catégories
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {produits.map((p) => (
            <ProductCard key={p.id} produit={p as unknown as ProductCardData} />
          ))}
        </div>
      )}
    </div>
  )
}
