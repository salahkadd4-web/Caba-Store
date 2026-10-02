import type fr from '../fr/home'

const home: typeof fr = {
  heroBadge: 'جديد · توصيل خلال 48 ساعة في الجزائر',
  heroTitle: 'منتجاتك المفضلة،',
  heroTitleAccent: 'تصلك إلى بيتك.',
  heroDesc: 'الدفع عند الاستلام، وإرجاع مجاني خلال 14 يومًا. في كل أنحاء الجزائر، منتجات مختارة بعناية.',
  buyNow: 'تسوّق الآن',
  seeCategories: 'تصفّح الفئات',
  delivery48: 'توصيل 48 ساعة',
  welcome: 'مرحبًا بك',
  mobileTitle1: 'منتجاتك',
  mobileTitle2: 'تصلك إلى بيتك',
  browse: 'تصفّح',
  categories: 'الفئات',
  popular: 'الأكثر طلبًا',
  bestSellers: 'الأكثر مبيعًا',
  newArrivalsEyebrow: 'الجديد',
  newArrivals: 'وصل حديثًا',
  seeAll: 'عرض الكل',
  seeAllShort: 'عرض الكل',
  bestSellersSoon: 'قريبًا: المنتجات الأكثر مبيعًا.',
  noCategories: 'لا توجد فئات متاحة.',
  noProducts: 'لا توجد منتجات متاحة.',
  productsCount: (n: number) => `${n} منتج`,
  trust: [
    { title: 'توصيل خلال 48 ساعة', desc: 'في كل أنحاء الجزائر' },
    { title: 'الدفع عند الاستلام', desc: 'ادفع عند استلام طلبك' },
    { title: 'إرجاع مجاني', desc: '14 يومًا لتغيير رأيك' },
  ],
  trustMobile: ['توصيل 48 ساعة', 'الدفع عند الاستلام', 'إرجاع 14 يومًا', 'آمن'],
  reassurance: [
    { title: 'دفع آمن', desc: 'معاملاتك محمية من البداية إلى النهاية.' },
    { title: 'توصيل سريع', desc: 'الشحن خلال 24 ساعة، والاستلام خلال 48 ساعة في جميع الولايات.' },
    { title: 'دعم 7/7', desc: 'لديك سؤال؟ فريقنا يجيبك كل يوم.' },
  ],
}

export default home
