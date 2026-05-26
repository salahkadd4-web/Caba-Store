import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import FavoriIconButton from '@/components/client/FavoriIconButton'
import CartIconButton from '@/components/client/CartIconButton'
import SuitcaseAnimationBg from '@/components/client/SuitcaseAnimationBg'
import { Banknote, Package, Tag } from 'lucide-react'
import { auth } from '@/auth'

export default async function HomePage() {
  const session = await auth()
  return (
    <div className="bg-white dark:bg-gray-950 transition-colors duration-300">

      {/* ── Hero Section avec animation ─────────────────── */}
      <section className="bg-black dark:bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6">
 
        {/* ── Animation valise en arrière-plan ── */}
        <SuitcaseAnimationBg />
      
        {/* ── Fond gradient (gardé, il se superpose à l'animation) ── */}
        <div className="absolute inset-0 bg-linear-to-b from-black via-gray-900 to-black opacity-40" />
      
        {/* ── Contenu identique à avant — z-10 pour passer au-dessus ── */}
        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
      
          <p className="text-gray-500 uppercase tracking-[0.5em] text-xs font-light mb-8">
            Première boutique online en Algérie spécialisée en importation
          </p>
      
          <div className="w-px h-12 bg-gray-600 mx-auto my-8" />
      
          <p className="text-gray-400 text-base md:text-lg font-light leading-relaxed max-w-lg mx-auto mb-10">
            Des produits d&apos;exception sélectionnés pour vous, livrés partout en Algérie.
          </p>
      
          <div className="flex gap-6 justify-center flex-wrap">
            <Link
              href="/produits"
              className="bg-white text-black hover:bg-gray-100 text-xs uppercase tracking-[0.3em] px-12 py-4 transition-all duration-300"
            >
              Explorer
            </Link>
            <Link
              href="/categories"
              className="border border-gray-600 text-gray-300 hover:border-white hover:text-white text-xs uppercase tracking-[0.3em] px-12 py-4 transition-all duration-300"
            >
              Catégories
            </Link>
          </div>
      
        </div>
      </section>

      {/* ── Catégories ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <Image
            src="/logo_noir.png"
            alt="CabaStore Logo"
            width={120}
            height={80}
            className="h-20 w-auto object-contain mx-auto mb-4 dark:invert"
          />
          <p className="text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] text-xs mb-4">Parcourir</p>
          <h2 className="text-4xl font-extralight tracking-widest text-black dark:text-white">Catégories</h2>
          <div className="w-12 h-px bg-black dark:bg-white mx-auto mt-6" />
        </div>
        <CategoriesSection />
      </section>

      {/* ── Bannière ─────────────────────────────────────── */}
      <div className="bg-black dark:bg-gray-900 py-16 px-6 text-center border-y border-gray-800">
        <p className="text-gray-500 uppercase tracking-[0.5em] text-xs mb-4">Notre Promesse</p>
        <h2 className="text-3xl md:text-5xl font-extralight text-white tracking-wider">L&apos;Excellence, Toujours</h2>
      </div>

      {/* ── Produits récents ─────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-900 py-24 px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Image
              src="/logo_noir.png"
              alt="CabaStore Logo"
              width={120}
              height={80}
              className="h-20 w-auto object-contain mx-auto mb-4 dark:invert"
            />
            <p className="text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] text-xs mb-4">Nouveautés</p>
            <h2 className="text-4xl font-extralight tracking-widest text-black dark:text-white">Dernières Arrivées</h2>
            <div className="w-12 h-px bg-black dark:bg-white mx-auto mt-6" />
          </div>
          <ProduitsSection />
          <div className="text-center mt-16">
            <Link
              href="/produits"
              className="nav-link border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-xs uppercase tracking-[0.3em] px-12 py-4 transition-all duration-300 inline-block"
            >
              Voir Tout
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="bg-black dark:bg-gray-950 text-white py-16 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="text-lg font-extralight tracking-[0.5em] uppercase mb-4">CabaStore</h3>
              <p className="text-gray-500 text-sm font-light leading-relaxed">L&apos;excellence à portée de main.</p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-4">Navigation</h4>
              <div className="space-y-2">
                {['/produits', '/categories'].map((href, i) => (
                  <Link key={href} href={href} className="block text-gray-500 hover:text-white text-xs uppercase tracking-widest transition-colors duration-300">
                    {['Produits', 'Catégories'][i]}
                  </Link>
                ))}
              </div>
            </div>
            {!session?.user && (
              <div>
                <h4 className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-4">Mon Compte</h4>
                <div className="space-y-2">
                  {['/connexion', '/inscription'].map((href, i) => (
                    <Link key={href} href={href} className="block text-gray-500 hover:text-white text-xs uppercase tracking-widest transition-colors duration-300">
                      {['Connexion', 'Inscription'][i]}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-xs">© 2026 CabaStore. Tous droits réservés.</p>
            <p className="text-gray-600 text-xs uppercase tracking-widest">Élégance & Qualité</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

async function CategoriesSection() {
  const categories = await prisma.category.findMany({
    where: { products: { some: { actif: true } } },
    include: {
      products: {
        where: {
          actif: true,
          OR: [
            { vendeurId: null },
            { vendeur: { prioriteAffichage: { lt: 99 } } },
          ],
        },
        // Tri par createdAt côté DB ; le tri par priorité se fait en JS ci-dessous
        orderBy: [{ createdAt: 'desc' }],
        take: 10,
        include: {
          vendeur: { select: { prioriteAffichage: true } },
          variants: { select: { id: true, couleur: true, nom: true }, orderBy: { createdAt: 'asc' } },
        },
      },
    },
  })

  if (categories.length === 0) {
    return <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Aucune catégorie disponible.</p>
  }

  return (
    <div className="space-y-14">
      {categories.map((cat) => {
        // Tri priorité en couche applicative : null (admin) → 0, vendeurs → leur niveau
        const produitsTries = [...cat.products].sort(
          (a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0)
        )

        return (
          <div key={cat.id}>
            {/* En-tête catégorie */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {cat.image ? (
                  <Image src={cat.image} alt={cat.nom} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-wide">{cat.nom}</h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">{cat.products.length} produits</span>
              </div>
              <Link
                href={`/categories/${cat.id}`}
                className="voir-tout-link text-xs uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
              >
                Voir tout →
              </Link>
            </div>

            {/* Ligne de produits scrollable */}
            <div className="products-row flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
              {produitsTries.map((produit) => {
                const tiers    = produit.prixVariables as { minQte: number; maxQte: number | null; prix: number }[] | null
                const hasTiers = Array.isArray(tiers) && tiers.length > 0
                const prixMin  = hasTiers ? Math.min(...tiers!.map(t => t.prix), produit.prix) : produit.prix
                const estReduit = hasTiers && prixMin < produit.prix

                return (
                  <Link
                    key={produit.id}
                    href={`/produits/${produit.id}`}
                    className="product-card group flex-none w-40 bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-transparent dark:border-gray-700 snap-start"
                  >
                    {/* Image */}
                    <div className="relative h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      {produit.images[0] ? (
                        <Image
                          src={produit.images[0]}
                          alt={produit.nom}
                          fill
                          sizes="160px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                      {hasTiers && (
                        <div className="absolute top-1.5 left-1.5">
                          <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                            <Banknote className="w-3 h-3 inline mr-0.5" />dégressif
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Infos */}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-800 dark:text-white line-clamp-2 mb-1.5 leading-tight">
                        {produit.nom}
                      </p>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        {hasTiers && (
                          <span className="text-[9px] text-gray-400">à partir de</span>
                        )}
                        <span className={`text-sm font-bold ${estReduit ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                          {prixMin.toFixed(2)} DA
                        </span>
                        {estReduit && (
                          <span className="text-[9px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold px-1 py-0.5 rounded-full">
                            −{Math.round((1 - prixMin / produit.prix) * 100)}%
                          </span>
                        )}
                      </div>
                      {/* Swatches */}
                      {produit.variants.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5">
                          {produit.variants.slice(0, 4).map(v =>
                            v.couleur ? (
                              <span
                                key={v.id}
                                title={v.nom}
                                className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shrink-0"
                                style={{ backgroundColor: v.couleur }}
                              />
                            ) : (
                              <span
                                key={v.id}
                                className="text-[8px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded-full"
                              >
                                {v.nom}
                              </span>
                            )
                          )}
                          {produit.variants.length > 4 && (
                            <span className="text-[8px] text-gray-400">+{produit.variants.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

async function ProduitsSection() {
  const produitsRaw = await prisma.product.findMany({
    where: {
      actif: true,
      OR: [
        { vendeurId: null },
        { vendeur: { prioriteAffichage: { lt: 99 } } },
      ],
    },
    // Tri par createdAt côté DB ; le tri par priorité se fait en JS ci-dessous
    orderBy: [{ createdAt: 'desc' }],
    take: 8,
    include: {
      vendeur: { select: { prioriteAffichage: true, nomBoutique: true } },
      category: true,
      variants: { select: { id: true, nom: true, couleur: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  // Tri priorité en couche applicative : null (admin) → 0, vendeurs → leur niveau
  const produits = [...produitsRaw].sort(
    (a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0)
  )

  if (produits.length === 0) {
    return <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Aucun produit disponible.</p>
  }

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
            className="product-card group bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-transparent dark:border-gray-700"
          >
            {/* Image */}
            <div className="relative h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {produit.images[0] ? (
                <Image
                  src={produit.images[0]}
                  alt={produit.nom}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <Package className="w-14 h-14" />
              )}

              {/* Badge dégressif */}
              {hasTiers && (
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-full shadow"><Banknote className="w-4 h-4 inline mr-1" />{' '}dégressif
                  </span>
                </div>
              )}

              {/* Actions favoris / panier */}
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <FavoriIconButton produitId={produit.id} />
                <CartIconButton produitId={produit.id} stock={produit.stock} />
              </div>
            </div>

            {/* Infos */}
            <div className="p-4">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{produit.category.nom}</p>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2">{produit.nom}</h3>

              {/* Bloc prix */}
              <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
                {hasTiers && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">à partir de</span>
                )}
                <span className={`text-lg font-bold ${estReduit ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                  {prixMin.toFixed(2)} DA
                </span>
                {estReduit && (
                  <>
                    <span className="text-sm text-gray-400 line-through font-normal">
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
                        className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 inline-block shrink-0"
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