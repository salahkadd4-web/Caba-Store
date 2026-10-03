import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export const revalidate = 60
import ProductCard, { type ProductCardData } from '@/components/client/ProductCard'
import { Package, SlidersHorizontal, Tag } from 'lucide-react'
import { PRODUIT_VISIBLE } from '@/lib/product-visibility'
import { getI18n } from '@/lib/i18n/server'
import { rankProducts, VENDEUR_RANK_SELECT } from '@/lib/product-ranking'
import { getViewerWilaya } from '@/lib/viewer'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { t } = await getI18n()
  const cat = await prisma.category.findUnique({
    where:  { id },
    select: { nom: true, description: true, image: true, _count: { select: { products: { where: { actif: true } } } } },
  })
  if (!cat) return { title: t.catalog.category.notFoundTitle }

  const title       = t.catalog.category.metaTitle(cat.nom)
  const description = cat.description
    ?? t.catalog.category.metaDescription(cat._count.products, cat.nom)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(cat.image && { images: [{ url: cat.image, alt: cat.nom }] }),
    },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ t }, viewerWilaya] = await Promise.all([getI18n(), getViewerWilaya()])
  const c = t.catalog.category

  const categorie = await prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        where: PRODUIT_VISIBLE,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          category: { select: { nom: true } },
          vendeur:  VENDEUR_RANK_SELECT,
          variants: { select: { id: true, nom: true, couleur: true }, orderBy: { createdAt: 'asc' } },
        },
      },
    },
  })

  if (!categorie) notFound()

  // Priorité d'abonnement → wilaya du visiteur → date
  const produits = rankProducts(categorie.products, viewerWilaya)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pt-4">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 mb-6">
        <Link href="/" className="hover:text-orange-700 dark:hover:text-orange-500 transition-colors">
          {t.layout.nav.home}
        </Link>
        <span className="inline-block rtl-flip">›</span>
        <Link href="/categories" className="hover:text-orange-700 dark:hover:text-orange-500 transition-colors">
          {t.layout.nav.categories}
        </Link>
        <span className="inline-block rtl-flip">›</span>
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
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500">
              {t.catalog.categories.productsCount(produits.length)}
            </p>
            {produits.length > 0 && (
              <Link
                href={`/produits?categorie=${categorie.id}`}
                className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-500 transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3" />
                {c.filterByWilaya}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Produits */}
      {produits.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-stone-400 dark:text-stone-500" />
          </div>
          <p className="text-lg text-stone-500 dark:text-stone-400 mb-4">
            {c.empty}
          </p>
          <Link
            href="/categories"
            className="inline-block bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {c.backToCategories}
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