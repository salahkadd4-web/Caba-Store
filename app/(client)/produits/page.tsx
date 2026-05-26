import { prisma } from '@/lib/prisma'
import ProduitsSearch from '@/components/client/ProduitsSearch'

type PrixTier = { minQte: number; maxQte: number | null; prix: number }
type ProduitSearch = {
  id: string
  nom: string
  images: string[]
  prix: number
  stock: number
  prixVariables?: PrixTier[] | null
  variants?: { id: string; nom: string; couleur: string | null }[]
  category: { nom: string }
}

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
          { vendeur: { prioriteAffichage: { lt: 99 } } },
        ],
        ...(categorie ? { categoryId: categorie } : {}),
        ...(recherche ? { nom: { contains: recherche, mode: 'insensitive' } } : {}),
      },
      // Tri par createdAt côté DB ; le tri par priorité se fait en JS ci-dessous
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        nom: true,
        images: true,
        prix: true,
        stock: true,
        prixVariables: true,
        category: { select: { nom: true } },
        variants: { select: { id: true, couleur: true, nom: true }, orderBy: { createdAt: 'asc' } },
        vendeur: { select: { prioriteAffichage: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { nom: 'asc' } }),
  ])

  // Tri priorité en couche applicative : null (admin) → 0, vendeurs → leur niveau
  const produits = [...produitsRaw].sort(
    (a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0)
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pt-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Produits</h1>
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