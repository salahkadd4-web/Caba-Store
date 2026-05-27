import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import FavoriIconButton from '@/components/client/FavoriIconButton'
import CartIconButton from '@/components/client/CartIconButton'
import CabaLogo from '@/components/CabaLogo'
import AppFooter from '@/components/AppFooter'
import { Banknote, Package, Tag, Truck, Wallet, RotateCcw, ShieldCheck, Headphones, Flame } from 'lucide-react'

export default async function HomePage() {
  return (
    <div className="bg-stone-50 dark:bg-stone-950 transition-colors duration-300">

      {/* ── Hero Section ──────────────────────────────────── */}
      <section className="bg-[#FAF7F2] dark:bg-stone-900 text-stone-800 dark:text-stone-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* ── Texte ── */}
          <div className="relative z-10 text-center md:text-left">

            <span className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
              Nouveau · Livraison 48h en Algérie
            </span>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight mb-6 leading-[1.05]">
              Vos produits préférés,
              <span className="block text-orange-700 dark:text-orange-400 font-normal italic mt-2">livrés chez vous.</span>
            </h1>

            <p className="text-stone-600 dark:text-stone-300 text-base md:text-lg font-light leading-relaxed max-w-lg mb-10 mx-auto md:mx-0">
              Paiement à la livraison, retours gratuits sous 14 jours. Partout en Algérie, des produits sélectionnés avec soin.
            </p>

            <div className="flex gap-3 justify-center md:justify-start flex-wrap">
              <Link
                href="/produits"
                className="bg-orange-700 hover:bg-orange-800 text-white text-sm font-medium px-8 py-4 rounded-full transition-colors shadow-sm hover:shadow"
              >
                Acheter maintenant
              </Link>
              <Link
                href="/categories"
                className="border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-stone-800 dark:hover:border-stone-100 text-sm font-medium px-8 py-4 rounded-full transition-colors"
              >
                Voir les catégories
              </Link>
            </div>

          </div>

          {/* ── Visuel logo ── */}
          <div className="relative z-10 flex justify-center md:justify-end">
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              <div className="absolute inset-0 rounded-full bg-orange-200/60 dark:bg-orange-950/30" />
              <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-orange-300/50 dark:bg-orange-900/30" />
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <CabaLogo className="w-full h-full text-orange-800 dark:text-orange-300" />
              </div>
            </div>
          </div>

        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-stone-300 dark:via-stone-700 to-transparent" />
      </section>

      {/* ── Trust strip ──────────────────────────────────── */}
      <section className="bg-[#FAF7F2] dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { Icon: Truck,     title: 'Livraison 48h',           desc: 'Partout en Algérie' },
            { Icon: Wallet,    title: 'Paiement à la livraison', desc: 'Payez à la réception' },
            { Icon: RotateCcw, title: 'Retours gratuits',        desc: '14 jours pour changer d’avis' },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-11 h-11 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-orange-700 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{title}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Catégories ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <CabaLogo className="w-16 h-16 text-orange-700 dark:text-orange-500 mx-auto mb-4 opacity-80" />
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-700 dark:text-orange-500 mb-4">Parcourir</p>
          <h2 className="text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Catégories</h2>
          <div className="w-12 h-px bg-orange-700 dark:bg-orange-500 mx-auto mt-6" />
        </div>
        <CategoriesSection />
      </section>

      {/* ── Bloc réassurance ─────────────────────────────── */}
      <section className="bg-stone-900 dark:bg-stone-950 py-16 px-6 border-y border-stone-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            {
              Icon: ShieldCheck,
              title: 'Paiement sécurisé',
              desc: 'Vos transactions sont protégées de bout en bout.',
            },
            {
              Icon: Truck,
              title: 'Livraison rapide',
              desc: 'Expédition sous 24h, réception en 48h dans les 58 wilayas.',
            },
            {
              Icon: Headphones,
              title: 'Support 7j/7',
              desc: 'Une question ? Notre équipe vous répond chaque jour.',
            },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-700/20 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-stone-100 text-base font-semibold mb-2 tracking-wide">{title}</h3>
              <p className="text-stone-400 text-sm font-light max-w-xs">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Best-sellers ─────────────────────────────────── */}
      <section className="bg-stone-50 dark:bg-stone-950 py-24 px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-700 dark:text-orange-500 mb-4 flex items-center justify-center gap-2">
              <Flame className="w-4 h-4" /> Populaires
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Meilleures Ventes</h2>
            <div className="w-12 h-px bg-orange-700 dark:bg-orange-500 mx-auto mt-6" />
          </div>
          <BestSellersSection />
        </div>
      </section>

      {/* ── Produits récents ─────────────────────────────── */}
      <section className="bg-[#FAF7F2] dark:bg-stone-900 py-24 px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <CabaLogo className="w-16 h-16 text-orange-700 dark:text-orange-500 mx-auto mb-4 opacity-80" />
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-700 dark:text-orange-500 mb-4">Nouveautés</p>
            <h2 className="text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Dernières Arrivées</h2>
            <div className="w-12 h-px bg-orange-700 dark:bg-orange-500 mx-auto mt-6" />
          </div>
          <ProduitsSection />
          <div className="text-center mt-16">
            <Link
              href="/produits"
              className="border border-stone-800 dark:border-stone-400 text-stone-800 dark:text-stone-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-900 text-xs uppercase tracking-[0.3em] px-12 py-4 transition-all duration-300 inline-block rounded-xl"
            >
              Voir Tout
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <AppFooter />
    </div>
  )
}

async function BestSellersSection() {
  const produitsRaw = await prisma.product.findMany({
    where: {
      actif: true,
      OR: [
        { vendeurId: null },
        { vendeur: { prioriteAffichage: { lt: 99 } } },
      ],
    },
    take: 40,
    orderBy: { orderItems: { _count: 'desc' } },
    include: {
      vendeur: { select: { prioriteAffichage: true } },
      category: true,
      variants: { select: { id: true, nom: true, couleur: true }, orderBy: { createdAt: 'asc' } },
      orderItems: { select: { id: true, order: { select: { statut: true } } } },
    },
  })

  const produits = produitsRaw
    .map(p => ({
      ...p,
      ventes: p.orderItems.filter(oi => oi.order.statut !== 'ANNULEE').length,
    }))
    .filter(p => p.ventes > 0)
    .sort((a, b) => b.ventes - a.ventes)
    .slice(0, 8)

  if (produits.length === 0) {
    return <p className="text-center text-stone-400 dark:text-stone-500 py-8 text-sm">Bientôt nos meilleures ventes.</p>
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
            className="product-card group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700"
          >
            <div className="relative h-48 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
              {produit.images[0] ? (
                <Image
                  src={produit.images[0]}
                  alt={produit.nom}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <Package className="w-14 h-14 text-stone-300 dark:text-stone-600" />
              )}

              <div className="absolute top-2 left-2 flex flex-col gap-1">
                <span className="text-[10px] bg-orange-600 text-white font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Top vente
                </span>
                {hasTiers && (
                  <span className="text-[10px] bg-orange-700 text-white font-bold px-1.5 py-0.5 rounded-full shadow">
                    <Banknote className="w-3 h-3 inline mr-1" />dégressif
                  </span>
                )}
              </div>

              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <FavoriIconButton produitId={produit.id} />
                <CartIconButton produitId={produit.id} stock={produit.stock} />
              </div>
            </div>

            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-1">{produit.category.nom}</p>
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2 line-clamp-2">{produit.nom}</h3>

              <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
                {hasTiers && (
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">à partir de</span>
                )}
                <span className={`text-lg font-bold ${estReduit ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-500'}`}>
                  {prixMin.toFixed(2)} DA
                </span>
                {estReduit && (
                  <>
                    <span className="text-sm text-stone-400 line-through font-normal">
                      {produit.prix.toFixed(2)}
                    </span>
                    <span className="text-[9px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold px-1 py-0.5 rounded-full">
                      −{Math.round((1 - prixMin / produit.prix) * 100)}%
                    </span>
                  </>
                )}
              </div>

              {produit.variants.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {produit.variants.slice(0, 5).map(v =>
                    v.couleur ? (
                      <span
                        key={v.id}
                        title={v.nom}
                        className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-600 inline-block shrink-0"
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
        orderBy: [{ createdAt: 'desc' }],
        take: 30,
        include: {
          vendeur: { select: { prioriteAffichage: true } },
          variants: { select: { id: true, couleur: true, nom: true }, orderBy: { createdAt: 'asc' } },
          orderItems: { select: { id: true, order: { select: { statut: true } } } },
        },
      },
    },
  })

  if (categories.length === 0) {
    return <p className="text-center text-stone-400 dark:text-stone-500 py-8 text-sm">Aucune catégorie disponible.</p>
  }

  return (
    <div className="space-y-14">
      {categories.map((cat) => {
        const produitsTries = cat.products
          .map(p => ({
            ...p,
            ventes: p.orderItems.filter(oi => oi.order.statut !== 'ANNULEE').length,
          }))
          .sort((a, b) => {
            if (b.ventes !== a.ventes) return b.ventes - a.ventes
            const prioDiff = (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0)
            if (prioDiff !== 0) return prioDiff
            return b.createdAt.getTime() - a.createdAt.getTime()
          })
          .slice(0, 10)

        return (
          <div key={cat.id}>
            {/* En-tête catégorie */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {cat.image ? (
                  <Image src={cat.image} alt={cat.nom} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-stone-400" />
                  </div>
                )}
                <h3 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">{cat.nom}</h3>
                <span className="text-xs text-stone-400 dark:text-stone-500">{cat.products.length} produits</span>
              </div>
              <Link
                href={`/categories/${cat.id}`}
                className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 hover:text-orange-800 border border-orange-200 dark:border-orange-800 hover:border-orange-400 px-3 py-1.5 rounded-full transition-colors"
              >
                Voir tout →
              </Link>
            </div>

            {/* Ligne de produits scrollable */}
            <div className="products-row flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
              {produitsTries.map((produit, idx) => {
                const tiers    = produit.prixVariables as { minQte: number; maxQte: number | null; prix: number }[] | null
                const hasTiers = Array.isArray(tiers) && tiers.length > 0
                const prixMin  = hasTiers ? Math.min(...tiers!.map(t => t.prix), produit.prix) : produit.prix
                const estReduit = hasTiers && prixMin < produit.prix
                const showRank = idx < 3 && produit.ventes > 0

                return (
                  <Link
                    key={produit.id}
                    href={`/produits/${produit.id}`}
                    className="product-card group flex-none w-40 bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700 snap-start"
                  >
                    {/* Image */}
                    <div className="relative h-40 bg-stone-100 dark:bg-stone-800 overflow-hidden">
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
                          <Package className="w-10 h-10 text-stone-300 dark:text-stone-600" />
                        </div>
                      )}
                      {showRank && (
                        <div className="absolute top-1.5 left-1.5">
                          <span className="w-6 h-6 flex items-center justify-center text-[11px] font-bold bg-stone-900/80 text-white rounded-full backdrop-blur-sm shadow">
                            {idx + 1}
                          </span>
                        </div>
                      )}
                      {hasTiers && (
                        <div className={`absolute ${showRank ? 'top-1.5 left-9' : 'top-1.5 left-1.5'}`}>
                          <span className="text-[9px] bg-orange-700 text-white font-bold px-1.5 py-0.5 rounded-full">
                            <Banknote className="w-3 h-3 inline mr-0.5" />dégressif
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Infos */}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 line-clamp-2 mb-1.5 leading-tight">
                        {produit.nom}
                      </p>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        {hasTiers && (
                          <span className="text-[9px] text-stone-400">à partir de</span>
                        )}
                        <span className={`text-sm font-bold ${estReduit ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-500'}`}>
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
                                className="w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                                style={{ backgroundColor: v.couleur }}
                              />
                            ) : (
                              <span
                                key={v.id}
                                className="text-[8px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded-full"
                              >
                                {v.nom}
                              </span>
                            )
                          )}
                          {produit.variants.length > 4 && (
                            <span className="text-[8px] text-stone-400">+{produit.variants.length - 4}</span>
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
    orderBy: [{ createdAt: 'desc' }],
    take: 8,
    include: {
      vendeur: { select: { prioriteAffichage: true, nomBoutique: true } },
      category: true,
      variants: { select: { id: true, nom: true, couleur: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  const produits = [...produitsRaw].sort(
    (a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0)
  )

  if (produits.length === 0) {
    return <p className="text-center text-stone-400 dark:text-stone-500 py-8 text-sm">Aucun produit disponible.</p>
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
            className="product-card group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700"
          >
            {/* Image */}
            <div className="relative h-48 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
              {produit.images[0] ? (
                <Image
                  src={produit.images[0]}
                  alt={produit.nom}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <Package className="w-14 h-14 text-stone-300 dark:text-stone-600" />
              )}

              {hasTiers && (
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] bg-orange-700 text-white font-bold px-1.5 py-0.5 rounded-full shadow">
                    <Banknote className="w-4 h-4 inline mr-1" />{' '}dégressif
                  </span>
                </div>
              )}

              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <FavoriIconButton produitId={produit.id} />
                <CartIconButton produitId={produit.id} stock={produit.stock} />
              </div>
            </div>

            {/* Infos */}
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-1">{produit.category.nom}</p>
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2 line-clamp-2">{produit.nom}</h3>

              <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
                {hasTiers && (
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">à partir de</span>
                )}
                <span className={`text-lg font-bold ${estReduit ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-500'}`}>
                  {prixMin.toFixed(2)} DA
                </span>
                {estReduit && (
                  <>
                    <span className="text-sm text-stone-400 line-through font-normal">
                      {produit.prix.toFixed(2)}
                    </span>
                    <span className="text-[9px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold px-1 py-0.5 rounded-full">
                      −{Math.round((1 - prixMin / produit.prix) * 100)}%
                    </span>
                  </>
                )}
              </div>

              {produit.variants.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {produit.variants.slice(0, 5).map(v =>
                    v.couleur ? (
                      <span
                        key={v.id}
                        title={v.nom}
                        className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-600 inline-block shrink-0"
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
