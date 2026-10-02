import type fr from '../fr/catalog'

const catalog: typeof fr = {
  products: {
    metaTitle: 'كل المنتجات — كابا ستور',
    metaDescription: 'تصفّح كتالوجنا الكامل من المنتجات المُوصلة في الجزائر. أزياء، منزل، إلكترونيات والمزيد.',
    metaOgDescription: 'تصفّح كتالوجنا الكامل من المنتجات المُوصلة في الجزائر.',
    eyebrow: 'الكتالوج',
    title: 'كل منتجاتنا',
  },
  categories: {
    title: 'الفئات',
    subtitle: 'تصفّح فئات منتجاتنا',
    empty: 'لا توجد فئات متاحة حاليًا.',
    productsCount: (n: number) => `${n} منتج`,
    seeAll: 'عرض الكل ←',
  },
  category: {
    notFoundTitle: 'الفئة غير موجودة — كابا ستور',
    metaTitle: (nom: string) => `${nom} — كابا ستور`,
    metaDescription: (n: number, nom: string) => `اكتشف ${n} منتجًا في فئة ${nom} في الجزائر.`,
    empty: 'لا توجد منتجات في هذه الفئة.',
    backToCategories: '→ العودة إلى الفئات',
    filterByWilaya: 'تصفية حسب الولاية',
  },
  favorites: {
    loadError: 'تعذّر تحميل مفضلاتك. يرجى المحاولة مرة أخرى.',
    retry: 'إعادة المحاولة',
    title: 'مفضلاتي',
    count: (n: number) => `${n} منتج في المفضلة`,
    empty: 'ليس لديك أي منتج في المفضلة بعد.',
    browse: 'تصفّح المنتجات',
    remove: 'إزالة من المفضلة',
    add: 'أضف إلى المفضلة',
    added: 'تمت الإضافة إلى المفضلة',
  },
  filters: {
    search: 'بحث',
    searchPlaceholder: 'ابحث...',
    categories: 'الفئات',
    allCategories: 'كل الفئات',
    sellerWilaya: 'ولاية البائع',
    allWilayas: 'كل الولايات',
    nearMe: 'ولايتي',
    reset: 'إعادة ضبط الفلاتر',
    clear: 'مسح الفلاتر',
    filters: 'الفلاتر',
    searching: 'جارٍ البحث…',
    searchingFull: 'جارٍ البحث…',
    count: () => 'منتج',
    found: () => '',
    emptyTitle: 'لم يتم العثور على أي منتج',
    emptyDesc: 'حاول تعديل معايير البحث.',
    seeAll: 'عرض كل المنتجات',
  },
}

export default catalog
