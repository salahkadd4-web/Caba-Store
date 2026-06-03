import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import ProductCard, { type ProductCardData } from '@/components/client/ProductCard'
import CabaLogo from '@/components/CabaLogo'
import { Flame, RotateCcw, ShieldCheck, Tag, Truck, Wallet, Headphones } from 'lucide-react'
import { VENDEUR_SUSPENDU_PRIORITE } from '@/lib/constants'

// ─── Filtres Prisma réutilisables ─────────────────────────────────────────────

const PRODUIT_ACTIF_WHERE = {
  actif: true,
  OR: [
    { vendeurId: null as null },
    { vendeur: { prioriteAffichage: { lt: VENDEUR_SUSPENDU_PRIORITE } } },
  ],
}

const VARIANT_SELECT = {
  select: { id: true, nom: true, couleur: true },
  orderBy: { createdAt: 'asc' as const },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="bg-stone-50 dark:bg-stone-950 transition-colors duration-300">

      {/* ══════════════════════════════════════════════════
          HERO — Desktop (md+)
      ══════════════════════════════════════════════════ */}
      <section className="hidden md:block bg-[#FAF7F2] dark:bg-stone-900 text-stone-800 dark:text-stone-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

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
              <Link href="/produits" className="bg-orange-700 hover:bg-orange-800 text-white text-sm font-medium px-8 py-4 rounded-full transition-colors shadow-sm hover:shadow">
                Acheter maintenant
              </Link>
              <Link href="/categories" className="border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-stone-800 dark:hover:border-stone-100 text-sm font-medium px-8 py-4 rounded-full transition-colors">
                Voir les catégories
              </Link>
            </div>
          </div>

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

      {/* ══════════════════════════════════════════════════
          HERO — Mobile (<md) : App-like
      ══════════════════════════════════════════════════ */}
      <section className="md:hidden bg-[#FAF7F2] dark:bg-stone-900 flex flex-col items-center justify-center pt-10 pb-6">

        {/* Logo centré grand */}
        <div className="flex flex-col items-center justify-center px-8 w-full">
          <CabaLogo className="w-full max-w-[320px] text-orange-700 dark:text-orange-400 drop-shadow-lg" />
        </div>

        {/* Bandeau trust compact */}
        <div className="mt-8 w-full flex items-center justify-around px-4 py-3 bg-white dark:bg-stone-800/60 border-y border-stone-200 dark:border-stone-700">
          {TRUST_ITEMS_MOBILE.map(({ Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium text-center leading-tight max-w-[64px]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          Trust strip — Desktop uniquement
      ══════════════════════════════════════════════════ */}
      <section className="hidden md:block bg-[#FAF7F2] dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TRUST_ITEMS.map(({ Icon, title, desc }) => (
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
          eyebrow="Parcourir"
          title="Catégories"
          logo
        />
        <Suspense fallback={<GridSkeleton />}>
          <CategoriesSection />
        </Suspense>
      </section>

      {/* ── Réassurance — Desktop uniquement ── */}
      <section className="hidden md:block bg-stone-900 dark:bg-stone-950 py-16 px-6 border-y border-stone-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {REASSURANCE_ITEMS.map(({ Icon, title, desc }) => (
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
            eyebrow={<><Flame className="w-4 h-4" /> Populaires</>}
            title="Meilleures Ventes"
          />
          <Suspense fallback={<GridSkeleton />}>
            <BestSellersSection />
          </Suspense>
        </div>
      </section>

      {/* ── Dernières arrivées ── */}
      <section className="bg-[#FAF7F2] dark:bg-stone-900 py-8 md:py-24 px-4 md:px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <SectionHeader eyebrow="Nouveautés" title="Dernières Arrivées" logo />
          <Suspense fallback={<GridSkeleton />}>
            <ProduitsSection />
          </Suspense>
          <div className="text-center mt-10 md:mt-16">
            <Link
              href="/produits"
              className="border border-stone-800 dark:border-stone-400 text-stone-800 dark:text-stone-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-900 text-xs uppercase tracking-[0.3em] px-12 py-4 transition-all duration-300 inline-block rounded-xl"
            >
              Voir Tout
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Sections async ───────────────────────────────────────────────────────────

async function BestSellersSection() {
  const produitsRaw = await prisma.product.findMany({
    where:   PRODUIT_ACTIF_WHERE,
    orderBy: { orderItems: { _count: 'desc' } },
    take:    20,
    include: {
      vendeur:    { select: { prioriteAffichage: true } },
      category:   { select: { nom: true } },
      variants:   VARIANT_SELECT,
      orderItems: { select: { id: true, order: { select: { statut: true } } } },
    },
  })

  const produits = produitsRaw
    .map((p) => ({
      ...p,
      ventes: p.orderItems.filter((oi) => oi.order.statut !== 'ANNULEE').length,
    }))
    .filter((p) => p.ventes > 0)
    .sort((a, b) => b.ventes - a.ventes)
    .slice(0, 8)

  if (produits.length === 0) {
    return <EmptyState message="Bientôt nos meilleures ventes." />
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
  const categories = await prisma.category.findMany({
    where:   { products: { some: { actif: true } } },
    include: {
      products: {
        where:   PRODUIT_ACTIF_WHERE,
        orderBy: [{ createdAt: 'desc' }],
        take:    30,
        include: {
          vendeur:    { select: { prioriteAffichage: true } },
          variants:   VARIANT_SELECT,
          orderItems: { select: { id: true, order: { select: { statut: true } } } },
        },
      },
    },
  })

  if (categories.length === 0) {
    return <EmptyState message="Aucune catégorie disponible." />
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {categories.map((cat) => {
        const produitsTries = cat.products
          .map((p) => ({
            ...p,
            ventes: p.orderItems.filter((oi) => oi.order.statut !== 'ANNULEE').length,
          }))
          .sort((a, b) => {
            if (b.ventes !== a.ventes) return b.ventes - a.ventes
            const prioDiff =
              (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0)
            return prioDiff !== 0 ? prioDiff : b.createdAt.getTime() - a.createdAt.getTime()
          })
          .slice(0, 10)

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
                  {cat.products.length} produits
                </span>
              </div>
              <Link
                href={`/categories/${cat.id}`}
                className="text-xs font-semibold text-orange-700 dark:text-orange-500 hover:text-orange-800"
              >
                <span className="hidden sm:inline uppercase tracking-wider border border-orange-200 dark:border-orange-800 hover:border-orange-400 px-3 py-1.5 rounded-full transition-colors">Voir tout</span>
                <span className="sm:hidden text-lg leading-none">›</span>
              </Link>
            </div>

            {/* Rangée scrollable */}
            <div className="products-row flex gap-3 md:gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
              {produitsTries.map((produit, idx) => (
                <ProductCard
                  key={produit.id}
                  produit={{ ...produit, category: cat } as unknown as ProductCardData}
                  compact
                  badges={
                    idx < 3 && produit.ventes > 0 ? (
                      <span key="rank" className="w-6 h-6 flex items-center justify-center text-[11px] font-bold bg-stone-900/80 text-white rounded-full backdrop-blur-sm shadow">
                        {idx + 1}
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

async function ProduitsSection() {
  const produitsRaw = await prisma.product.findMany({
    where:   PRODUIT_ACTIF_WHERE,
    orderBy: [{ createdAt: 'desc' }],
    take:    8,
    include: {
      vendeur:  { select: { prioriteAffichage: true, nomBoutique: true } },
      category: { select: { nom: true } },
      variants: VARIANT_SELECT,
    },
  })

  const produits = [...produitsRaw].sort(
    (a, b) => (a.vendeur?.prioriteAffichage ?? 0) - (b.vendeur?.prioriteAffichage ?? 0),
  )

  if (produits.length === 0) {
    return <EmptyState message="Aucun produit disponible." />
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
        <CabaLogo className="w-10 h-10 md:w-16 md:h-16 text-orange-700 dark:text-orange-500 mx-auto mb-3 md:mb-4 opacity-80" />
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

// ─── Data statique ────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { Icon: Truck,     title: 'Livraison 48h',           desc: 'Partout en Algérie' },
  { Icon: Wallet,    title: 'Paiement à la livraison', desc: 'Payez à la réception' },
  { Icon: RotateCcw, title: 'Retours gratuits',        desc: "14 jours pour changer d'avis" },
]

const TRUST_ITEMS_MOBILE = [
  { Icon: Truck,       label: 'Livraison 48h' },
  { Icon: Wallet,      label: 'Paiement livraison' },
  { Icon: RotateCcw,   label: 'Retour 14j' },
  { Icon: ShieldCheck, label: 'Sécurisé' },
]

const REASSURANCE_ITEMS = [
  { Icon: ShieldCheck, title: 'Paiement sécurisé',  desc: 'Vos transactions sont protégées de bout en bout.' },
  { Icon: Truck,       title: 'Livraison rapide',   desc: 'Expédition sous 24h, réception en 48h dans les 58 wilayas.' },
  { Icon: Headphones,  title: 'Support 7j/7',       desc: 'Une question ? Notre équipe vous répond chaque jour.' },
]