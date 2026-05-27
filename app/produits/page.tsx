import { prisma } from '@/lib/prisma'
import ProduitsSearch, { type ProduitSearch } from '@/components/client/ProduitsSearch'
import { VENDEUR_SUSPENDU_PRIORITE } from '@/lib/constants'

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; recherche?: string }>
}) {
  const { categorie, recherche } = await searchParams

  const [produitsRaw, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        actif: true,
        OR: [
          { vendeurId: null },
          { vendeur: { prioriteAffichage: { lt: VENDEUR_SUSPENDU_PRIORITE } } },
        ],
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
        category:      { select: { nom: true } },
        variants:      { select: { id: true, couleur: true, nom: true }, orderBy: { createdAt: 'asc' } },
        vendeur:       { select: { prioriteAffichage: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { nom: 'asc' } }),
  ])

  const produits = [...produitsRaw].sort(
    (a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0),
  )

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-20 md:pb-12">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1">
          Catalogue
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Tous nos produits
        </h1>
      </div>

      <ProduitsSearch
        categories={categories}
        initialProduits={produits as unknown as ProduitSearch[]}
        initialRecherche={recherche}
        initialCategorie={categorie}
      />
    </div>
  )
}
