import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const recherche = req.nextUrl.searchParams.get('recherche')?.trim()
  const categorie = req.nextUrl.searchParams.get('categorie')?.trim()

  const produitsRaw = await prisma.product.findMany({
    where: {
      actif: true,
      OR: [
        { vendeurId: null },
        { vendeur: { prioriteAffichage: { lt: 99 } } },
      ],
      ...(categorie ? { categoryId: categorie } : {}),
      ...(recherche ? { nom: { contains: recherche, mode: 'insensitive' } } : {}),
    },
    // Tri DB par date ; le tri priorité se fait en JS ci-dessous
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
  })

  // Tri priorité applicatif : admin (null → 0) avant vendeurs
  const produits = [...produitsRaw].sort(
    (a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0)
  )

  return NextResponse.json(produits, {
    headers: {
      // CDN : sert jusqu'à 60 s de cache, puis ressert l'ancien pendant 5 min
      // pendant qu'il revalide en arrière-plan. Jamais de cache privé (no-store
      // sur les navigateurs) car les résultats de recherche ne sont pas
      // personnalisés mais ne doivent pas non plus se retrouver dans le cache
      // partagé du navigateur d'un utilisateur précédent.
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}