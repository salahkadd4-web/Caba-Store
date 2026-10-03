import type fr from '../fr/catalog'

const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`

const catalog: typeof fr = {
  products: {
    metaTitle: 'All products — Caba Store',
    metaDescription: 'Browse our full catalogue of products delivered across Algeria. Fashion, home, electronics and more.',
    metaOgDescription: 'Browse our full catalogue of products delivered across Algeria.',
    eyebrow: 'Catalogue',
    title: 'All our products',
  },
  categories: {
    title: 'Categories',
    subtitle: 'Browse our product categories',
    empty: 'No categories available yet.',
    productsCount: (n: number): string => `${n} ${plural(n, 'product')}`,
    seeAll: 'See all →',
  },
  category: {
    notFoundTitle: 'Category not found — Caba Store',
    metaTitle: (nom: string): string => `${nom} — Caba Store`,
    metaDescription: (n: number, nom: string): string => `Discover our ${n} products in the ${nom} category in Algeria.`,
    empty: 'No products in this category.',
    backToCategories: '← Back to categories',
    filterByWilaya: 'Filter by wilaya',
  },
  favorites: {
    loadError: 'Could not load your favourites. Please try again.',
    retry: 'Try again',
    title: 'My Favourites',
    count: (n: number): string => `${n} favourite ${plural(n, 'product')}`,
    empty: "You don't have any favourites yet.",
    browse: 'Browse products',
    remove: 'Remove from favourites',
    add: 'Add to favourites',
    added: 'Added to favourites',
  },
  filters: {
    search: 'Search',
    searchPlaceholder: 'Search...',
    categories: 'Categories',
    allCategories: 'All categories',
    sellerWilaya: "Seller's wilaya",
    allWilayas: 'All wilayas',
    nearMe: 'My wilaya',
    reset: 'Reset filters',
    clear: 'Clear filters',
    filters: 'Filters',
    searching: 'Searching…',
    searchingFull: 'Searching…',
    count: (n: number): string => plural(n, 'product'),
    found: (): string => ' found',
    emptyTitle: 'No products found',
    emptyDesc: 'Try changing your search criteria.',
    seeAll: 'See all products',
  },
}

export default catalog
