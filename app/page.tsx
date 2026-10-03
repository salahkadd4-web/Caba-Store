import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import ProductCard, { type ProductCardData } from '@/components/client/ProductCard'
import CabaLogo from '@/components/CabaLogo'
import { Flame, RotateCcw, ShieldCheck, Tag, Truck, Wallet, Headphones } from 'lucide-react'
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
  const trustItemsMobile = [Truck, Wallet, RotateCcw, ShieldCheck].map((Icon, i) => ({ Icon, label: h.trustMobile[i] }))
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

        {/* ── App Header Bar ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2">
            <CabaLogo className="w-7 h-7 text-orange-700 dark:text-orange-400" />
            <span className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-50">{t.common.appName}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            {h.delivery48}
          </span>
        </div>

        {/* ── Hero Banner compact ── */}
        <div className="mx-3 mb-3 rounded-2xl overflow-hidden relative" style={{background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #d97706 100%)'}}>
          <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
          <div className="absolute -end-6 -top-6 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute end-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="relative px-5 py-5 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-orange-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{h.welcome}</p>
              <h1 className="text-white text-[22px] font-bold leading-snug tracking-tight mb-3">
                {h.mobileTitle1}<br />{h.mobileTitle2}
              </h1>
              <Link
                href="/produits"
                className="inline-flex items-center gap-1.5 bg-white text-orange-700 text-[13px] font-bold px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-transform"
              >
                {h.buyNow}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rtl-flip"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
            <CabaLogo className="shrink-0 w-20 h-20 text-white/15" />
          </div>
        </div>

        {/* ── Trust Pills — défilement infini (mobile) ── */}
        <div className="overflow-hidden pb-2">
          {/* La piste est dupliquée (×2) pour que la boucle soit invisible */}
          <div className="trust-marquee-track flex gap-2 w-max">
            {[...trustItemsMobile, ...trustItemsMobile].map(({ Icon, label }, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full px-3 py-1.5 shadow-sm"
              >
                <Icon className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap">
                  {label}
                </span>
              </div>
            ))}
          </div>
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
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-24">
        <SectionHeader
          eyebrow={h.browse}
          title={h.categories}
          logo
        />
        <Suspense fallback={<GridSkeleton />}>
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
              <h3 className="text-stone-100 text-base font-semibold mb-2 tracking-wide">{title}</h3>
              <p className="text-stone-400 text-sm font-light max-w-xs">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Best-sellers ── */}
      <section className="bg-stone-50 dark:bg-stone-950 py-8 md:py-24 px-4 md:px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            eyebrow={<><Flame className="w-4 h-4" /> {h.popular}</>}
            title={h.bestSellers}
          />
          <Suspense fallback={<GridSkeleton />}>
            <BestSellersSection />
          </Suspense>
        </div>
      </section>

      {/* ── Dernières arrivées ── */}
      <section className="bg-[#FAF7F2] dark:bg-stone-900 py-8 md:py-24 px-4 md:px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <SectionHeader eyebrow={h.newArrivalsEyebrow} title={h.newArrivals} logo />
          <Suspense fallback={<GridSkeleton />}>
            <ProduitsSection />
          </Suspense>
          <div className="text-center mt-10 md:mt-16">
            <Link
              href="/produits"
              className="border border-stone-800 dark:border-stone-400 text-stone-800 dark:text-stone-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-900 text-xs uppercase tracking-[0.3em] px-12 py-4 transition-all duration-300 inline-block rounded-xl"
            >
              {h.seeAll}
            </Link>
          </div>
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
            <span className="text-[10px] bg-orange-600 text-white font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
              <Flame className="w-3 h-3" /> #{idx + 1}
            </span>
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
          take:    30,
          include: {
            vendeur:    VENDEUR_RANK_SELECT,
            variants:   VARIANT_SELECT,
            orderItems: { select: { id: true, order: { select: { statut: true } } } },
          },
        },
      },
    }),
  ])

  if (categories.length === 0) {
    return <EmptyState message={t.home.noCategories} />
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {categories.map((cat) => {
        const avecVentes = cat.products.map((p) => ({
          ...p,
          ventes: p.orderItems.filter((oi) => oi.order.statut !== 'ANNULEE').length,
        }))
        // Badge de rang réservé aux 3 meilleures ventes réelles de la catégorie
        const top3 = new Map(
          [...avecVentes]
            .filter((p) => p.ventes > 0)
            .sort((a, b) => b.ventes - a.ventes)
            .slice(0, 3)
            .map((p, i) => [p.id, i + 1]),
        )
        // Ordre d'affichage : priorité abonnement → wilaya du visiteur → date
        const produitsTries = rankProducts(avecVentes, viewerWilaya).slice(0, 10)

        return (
          <div key={cat.id}>
            {/* En-tête catégorie */}
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div className="flex items-center gap-2 md:gap-3">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.nom}
                    width={32}
                    height={32}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 md:w-4 md:h-4 text-stone-400" />
                  </div>
                )}
                <h3 className="text-base md:text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  {cat.nom}
                </h3>
                <span className="text-xs text-stone-400 dark:text-stone-500 hidden sm:inline">
                  {t.home.productsCount(cat.products.length)}
                </span>
              </div>
              <Link
                href={`/categories/${cat.id}`}
                className="text-xs font-semibold text-orange-700 dark:text-orange-500 hover:text-orange-800"
              >
                <span className="hidden sm:inline uppercase tracking-wider border border-orange-200 dark:border-orange-800 hover:border-orange-400 px-3 py-1.5 rounded-full transition-colors">{t.home.seeAllShort}</span>
                <span className="sm:hidden text-lg leading-none inline-block rtl-flip">›</span>
              </Link>
            </div>

            {/* Rangée scrollable */}
            <div className="products-row flex gap-3 md:gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
              {produitsTries.map((produit) => {
                const rang = top3.get(produit.id)
                return (
                  <ProductCard
                    key={produit.id}
                    produit={{ ...produit, category: cat } as unknown as ProductCardData}
                    compact
                    badges={
                      rang ? (
                        <span key="rank" className="w-6 h-6 flex items-center justify-center text-[11px] font-bold bg-stone-900/80 text-white rounded-full backdrop-blur-sm shadow">
                          {rang}
                        </span>
                      ) : undefined
                    }
                  />
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
  eyebrow,
  title,
  logo = false,
}: {
  eyebrow: React.ReactNode
  title: string
  logo?: boolean
}) {
  return (
    <div className="text-center mb-8 md:mb-16">
      {logo && (
        <CabaLogo className="hidden md:block w-16 h-16 text-orange-700 dark:text-orange-500 mx-auto mb-4 opacity-80" />
      )}
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-orange-700 dark:text-orange-500 mb-3 md:mb-4 flex items-center justify-center gap-2">
        {eyebrow}
      </p>
      <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        {title}
      </h2>
      <div className="w-10 md:w-12 h-px bg-orange-700 dark:bg-orange-500 mx-auto mt-4 md:mt-6" />
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
