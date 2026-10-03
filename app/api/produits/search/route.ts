import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PRODUIT_VISIBLE, VENDEUR_VISIBLE } from '@/lib/product-visibility'
import { normalizeWilayaCode } from '@/lib/algeria'
import { rankProducts, VENDEUR_RANK_SELECT, wilayaDbValues } from '@/lib/product-ranking'

// Paramètres :
//   recherche  texte libre (nom du produit)
//   categorie  id de catégorie
//   wilaya     filtre : code de la wilaya du vendeur
//   proche     classement : code de la wilaya du visiteur (ses vendeurs passent en premier
//              à priorité d'abonnement égale). Passé dans l'URL et non lu depuis la
//              session, pour que le cache CDN reste correct.
export async function GET(req: NextRequest) {
  const params    = req.nextUrl.searchParams
  const recherche = params.get('recherche')?.trim()
  const categorie = params.get('categorie')?.trim()
  const wilaya    = normalizeWilayaCode(params.get('wilaya'))
  const proche    = normalizeWilayaCode(params.get('proche'))

  const produitsRaw = await prisma.product.findMany({
    where: {
      ...(wilaya
        // Filtre wilaya : uniquement les vendeurs de cette wilaya (exclut le catalogue sans vendeur)
        ? { actif: true, vendeur: {
            ...VENDEUR_VISIBLE,
            user: { wilaya: { in: wilayaDbValues(wilaya) } },
          } }
        : PRODUIT_VISIBLE),
      ...(categorie ? { categoryId: categorie } : {}),
      ...(recherche ? { nom: { contains: recherche, mode: 'insensitive' } } : {}),
    },
    // Tri DB par date ; le classement complet se fait en JS (rankProducts)
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      nom: true,
      images: true,
      prix: true,
      stock: true,
      prixVariables: true,
      createdAt: true,
      category: { select: { nom: true } },
      variants: { select: { id: true, couleur: true, nom: true }, orderBy: { createdAt: 'asc' } },
      vendeur: VENDEUR_RANK_SELECT,
    },
  })

  // Priorité d'abonnement → wilaya du visiteur → date
  const produits = rankProducts(produitsRaw, proche)

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
