import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

export const revalidate = 60
import ProduitsSearch from '@/components/client/ProduitsSearch'
import { PRODUIT_VISIBLE, VENDEUR_VISIBLE } from '@/lib/product-visibility'
import { getI18n } from '@/lib/i18n/server'
import { normalizeWilayaCode } from '@/lib/algeria'
import { rankProducts, VENDEUR_RANK_SELECT, wilayaDbValues } from '@/lib/product-ranking'
import { getViewerWilaya } from '@/lib/viewer'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  const p = t.catalog.products
  return {
    title:       p.metaTitle,
    description: p.metaDescription,
    openGraph: {
      title:       p.metaTitle,
      description: p.metaOgDescription,
      type:        'website',
    },
  }
}

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; recherche?: string; wilaya?: string }>
}) {
  const { categorie, recherche, wilaya: wilayaParam } = await searchParams
  const wilaya = normalizeWilayaCode(wilayaParam)

  const [produitsRaw, categories, viewerWilaya, { t }] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...(wilaya
          // Filtre wilaya : uniquement les vendeurs de cette wilaya
          ? { actif: true, vendeur: {
              ...VENDEUR_VISIBLE,
              user: { wilaya: { in: wilayaDbValues(wilaya) } },
            } }
          : PRODUIT_VISIBLE),
        ...(categorie ? { categoryId: categorie } : {}),
        ...(recherche  ? { nom: { contains: recherche, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id:            true,
        nom:           true,
        images:        true,
        prix:          true,
        stock:         true,
        prixVariables: true,
        createdAt:     true,
        category:      { select: { nom: true } },
        variants:      { select: { id: true, couleur: true, nom: true }, orderBy: { createdAt: 'asc' } },
        vendeur:       VENDEUR_RANK_SELECT,
      },
    }),
    prisma.category.findMany({ orderBy: { nom: 'asc' } }),
    getViewerWilaya(),
    getI18n(),
  ])

  // Priorité d'abonnement → wilaya du visiteur → date
  const produits = rankProducts(produitsRaw, viewerWilaya)

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-20 md:pb-12">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1">
          {t.catalog.products.eyebrow}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {t.catalog.products.title}
        </h1>
      </div>

      <ProduitsSearch
        categories={categories}
        initialProduits={produits}
        initialRecherche={recherche}
        initialCategorie={categorie}
        initialWilaya={wilaya ?? undefined}
        viewerWilaya={viewerWilaya}
      />
    </div>
  )
}
