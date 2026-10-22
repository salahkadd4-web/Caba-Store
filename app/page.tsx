import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import ProductCard, { type ProductCardData } from '@/components/client/ProductCard'
import CategoryTile from '@/components/client/CategoryTile'
import CabaLogo from '@/components/CabaLogo'
import { ArrowRight, ChevronRight, RotateCcw, ShieldCheck, Truck, Wallet, Headphones } from 'lucide-react'
import { PRODUIT_VISIBLE } from '@/lib/product-visibility'
import { getI18n } from '@/lib/i18n/server'
import { rankProducts, VENDEUR_RANK_SELECT } from '@/lib/product-ranking'
import { getViewerWilaya } from '@/lib/viewer'

// ─── Filtres Prisma réutilisables ─────────────────────────────────────────────

const PRODUIT_ACTIF_WHERE = PRODUIT_VISIBLE

const VARIANT_SELECT = {
  select: { id: true, nom: true, couleur: true },
  orderBy: { createdAt: 'asc' as const },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const { t } = await getI18n()
  const h = t.home

  const trustItems = [Truck, Wallet, RotateCcw].map((Icon, i) => ({ Icon, ...h.trust[i] }))
  const reassuranceItems = [ShieldCheck, Truck, Headphones].map((Icon, i) => ({ Icon, ...h.reassurance[i] }))

  return (
    <div className="bg-stone-50 dark:bg-stone-950 transition-colors duration-300">

      {/* ══════════════════════════════════════════════════
          HERO — Desktop (md+)
      ══════════════════════════════════════════════════ */}
      <section className="hidden md:block bg-[#FAF7F2] dark:bg-stone-900 text-stone-800 dark:text-stone-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          <div className="relative z-10 text-center md:text-start">
            <span className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
              {h.heroBadge}
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight mb-6 leading-[1.05]">
              {h.heroTitle}
              <span className="block text-orange-700 dark:text-orange-400 font-normal italic mt-2">{h.heroTitleAccent}</span>
            </h1>
            <p className="text-stone-600 dark:text-stone-300 text-base md:text-lg font-light leading-relaxed max-w-lg mb-10 mx-auto md:mx-0">
              {h.heroDesc}
            </p>
            <div className="flex gap-3 justify-center md:justify-start flex-wrap">
              <Link href="/produits" className="bg-orange-700 hover:bg-orange-800 text-white text-sm font-medium px-8 py-4 rounded-full transition-colors shadow-sm hover:shadow">
                {h.buyNow}
              </Link>
              <Link href="/categories" className="border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-stone-800 dark:hover:border-stone-100 text-sm font-medium px-8 py-4 rounded-full transition-colors">
                {h.seeCategories}
              </Link>
            </div>
          </div>

          <div className="relative z-10 flex justify-center md:justify-end">
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              <div className="absolute inset-0 rounded-full bg-orange-200/60 dark:bg-orange-950/30" />
              <div className="absolute -top-4 -end-4 w-32 h-32 rounded-full bg-orange-300/50 dark:bg-orange-900/30" />
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <CabaLogo className="w-full h-full text-orange-800 dark:text-orange-300" />
              </div>
            </div>
          </div>

        </div>
        <div className="absolute bottom-0 start-0 end-0 h-px bg-linear-to-r from-transparent via-stone-300 dark:via-stone-700 to-transparent" />
      </section>

      {/* ══════════════════════════════════════════════════
          HERO — Mobile (<md) : Native App Header
      ══════════════════════════════════════════════════ */}
      <section className="md:hidden">

        {/* ── Bandeau d'accueil (la marque est déjà dans la barre du haut) ── */}
        <div className="mx-3 mt-3 mb-3 rounded-2xl overflow-hidden" style={{background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)'}}>
          <div className="px-5 py-5">
            <p className="text-orange-100 text-sm font-medium mb-1">{h.welcome}</p>
            <h1 className="text-white text-2xl font-semibold leading-tight mb-4">
              {h.mobileTitle1} {h.mobileTitle2}
            </h1>
            <Link
              href="/produits"
              className="inline-flex items-center gap-1.5 bg-white text-orange-800 text-sm font-semibold h-10 px-4 rounded-xl active:scale-95 transition-transform"
            >
              {h.buyNow}
              <ArrowRight className="w-4 h-4 rtl-flip" />
            </Link>
          </div>
        </div>

        {/* ── Garanties : fixes, sans défilement ── */}
        <div className="grid grid-cols-3 gap-2 px-3 pb-1 text-center">
          {trustItems.map(({ Icon, title }) => (
            <div key={title} className="flex flex-col items-center gap-1.5">
              <span className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5" />
              </span>
              <span className="text-xs font-medium text-stone-600 dark:text-stone-300 leading-tight">{title}</span>
            </div>
          ))}
        </div>

      </section>

      {/* ══════════════════════════════════════════════════
          Trust strip — Desktop uniquement
      ══════════════════════════════════════════════════ */}
      <section className="hidden md:block bg-[#FAF7F2] dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {trustItems.map(({ Icon, title, desc }) => (
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

      {/* ── Catégories ── */}
      <section className="max-w-7xl mx-auto px-3 md:px-6 pt-6 pb-8 md:py-16">
        <SectionHeader title={h.categories} href="/categories" linkLabel={t.home.seeAllShort} />
        <Suspense fallback={<TilesSkeleton />}>
          <CategoriesSection />
        </Suspense>
      </section>

      {/* ── Réassurance — Desktop uniquement ── */}
      <section className="hidden md:block bg-stone-900 dark:bg-stone-950 py-16 px-6 border-y border-stone-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {reassuranceItems.map(({ Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-700/20 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-stone-100 text-base font-semibold mb-2 ">{title}</h3>
              <p className="text-stone-400 text-sm font-light max-w-xs">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Best-sellers ── */}
      <section className="bg-stone-50 dark:bg-stone-950 py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-3 md:px-6">
          <SectionHeader title={h.bestSellers} href="/produits" linkLabel={t.home.seeAllShort} />
          <Suspense fallback={<GridSkeleton />}>
            <BestSellersSection />
          </Suspense>
        </div>
      </section>

      {/* ── Dernières arrivées ── */}
      <section className="bg-[#FAF7F2] dark:bg-stone-900 py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-3 md:px-6">
          <SectionHeader title={h.newArrivals} href="/produits" linkLabel={t.home.seeAllShort} />
          <Suspense fallback={<GridSkeleton />}>
            <ProduitsSection />
          </Suspense>
        </div>
      </section>
    </div>
  )
}

// ─── Sections async ───────────────────────────────────────────────────────────

// Classement par ventes : c'est la définition même de cette section (badges #1, #2…).
async function BestSellersSection() {
  const [{ t }, produitsRaw] = await Promise.all([
    getI18n(),
    prisma.product.findMany({
      where:   PRODUIT_ACTIF_WHERE,
      orderBy: { orderItems: { _count: 'desc' } },
      take:    20,
      include: {
        vendeur:    { select: { prioriteAffichage: true } },
        category:   { select: { nom: true } },
        variants:   VARIANT_SELECT,
        orderItems: { select: { id: true, order: { select: { statut: true } } } },
      },
    }),
  ])

  const produits = produitsRaw
    .map((p) => ({
      ...p,
      ventes: p.orderItems.filter((oi) => oi.order.statut !== 'ANNULEE').length,
    }))
    .filter((p) => p.ventes > 0)
    .sort((a, b) => b.ventes - a.ventes)
    .slice(0, 8)

  if (produits.length === 0) {
    return <EmptyState message={t.home.bestSellersSoon} />
  }

  return (
    <div className="products-grid grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {produits.map((produit, idx) => (
        <ProductCard
          key={produit.id}
          produit={produit as unknown as ProductCardData}
          badges={
            idx < 3 ? (
              <span className="text-xs font-semibold bg-stone-900 text-white px-2 py-0.5 rounded-full">
                {t.home.topRank(idx + 1)}
              </span>
            ) : undefined
          }
        />
      ))}
    </div>
  )
}

async function CategoriesSection() {
  const [{ t }, viewerWilaya, categories] = await Promise.all([
    getI18n(),
    getViewerWilaya(),
    prisma.category.findMany({
      where:   { products: { some: PRODUIT_ACTIF_WHERE } },
      include: {
        products: {
          where:   PRODUIT_ACTIF_WHERE,
          orderBy: [{ createdAt: 'desc' }],
          take:    12,
          select:  { images: true, createdAt: true, vendeur: VENDEUR_RANK_SELECT },
        },
        _count: { select: { products: { where: PRODUIT_ACTIF_WHERE } } },
      },
    }),
  ])

  if (categories.length === 0) {
    return <EmptyState message={t.home.noCategories} />
  }

  // Les catégories les plus fournies d'abord ; 6 tuiles suffisent, « Voir tout » mène au reste
  const tuiles = [...categories]
    .sort((a, b) => b._count.products - a._count.products)
    .slice(0, 6)

  return (
    <div className="flex md:grid md:grid-cols-6 gap-3 md:gap-4 overflow-x-auto md:overflow-visible scrollbar-hide snap-x snap-mandatory -mx-3 px-3 md:mx-0 md:px-0 pb-1">
      {tuiles.map((cat) => (
        <div key={cat.id} className="w-36 shrink-0 snap-start md:w-auto">
          <CategoryTile
            href={`/categories/${cat.id}`}
            nom={cat.nom}
            detail={t.catalog.categories.productsCount(cat._count.products)}
            images={rankProducts(cat.products, viewerWilaya).slice(0, 4).map(p => p.images[0])}
          />
        </div>
      ))}
    </div>
  )
}

async function ProduitsSection() {
  const [{ t }, viewerWilaya, produitsRaw] = await Promise.all([
    getI18n(),
    getViewerWilaya(),
    prisma.product.findMany({
      where:   PRODUIT_ACTIF_WHERE,
      orderBy: [{ createdAt: 'desc' }],
      take:    8,
      include: {
        vendeur:  { select: { ...VENDEUR_RANK_SELECT.select, nomBoutique: true } },
        category: { select: { nom: true } },
        variants: VARIANT_SELECT,
      },
    }),
  ])

  const produits = rankProducts(produitsRaw, viewerWilaya)

  if (produits.length === 0) {
    return <EmptyState message={t.home.noProducts} />
  }

  return (
    <div className="products-grid grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {produits.map((produit) => (
        <ProductCard key={produit.id} produit={produit as unknown as ProductCardData} />
      ))}
    </div>
  )
}

// ─── Composants UI partagés ───────────────────────────────────────────────────

function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string
  href: string
  linkLabel: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-4 md:mb-6">
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        {title}
      </h2>
      <Link
        href={href}
        className="shrink-0 inline-flex items-center gap-0.5 text-sm font-medium text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
      >
        {linkLabel}
        <ChevronRight className="w-4 h-4 rtl-flip" />
      </Link>
    </div>
  )
}

function TilesSkeleton() {
  return (
    <div className="flex md:grid md:grid-cols-6 gap-3 md:gap-4 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-36 shrink-0 md:w-auto aspect-[4/5] rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-center text-stone-400 dark:text-stone-500 py-8 text-sm">{message}</p>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse h-52 md:h-64" />
      ))}
    </div>
  )
}
