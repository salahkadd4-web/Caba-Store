import type fr from '../fr/home'

const home: typeof fr = {
  heroBadge: 'New · 48h delivery across Algeria',
  heroTitle: 'Your favourite products,',
  heroTitleAccent: 'delivered to your door.',
  heroDesc: 'Cash on delivery, free returns within 14 days. Carefully selected products, anywhere in Algeria.',
  buyNow: 'Shop now',
  seeCategories: 'See categories',
  delivery48: '48h delivery',
  welcome: 'Welcome',
  mobileTitle1: 'Your products',
  mobileTitle2: 'delivered to your door',
  browse: 'Browse',
  categories: 'Categories',
  popular: 'Popular',
  bestSellers: 'Best Sellers',
  newArrivalsEyebrow: 'New in',
  newArrivals: 'Latest Arrivals',
  seeAll: 'See All',
  seeAllShort: 'See all',
  bestSellersSoon: 'Our best sellers are coming soon.',
  noCategories: 'No categories available.',
  noProducts: 'No products available.',
  productsCount: (n: number): string => `${n} products`,
  trust: [
    { title: '48h delivery', desc: 'Anywhere in Algeria' },
    { title: 'Cash on delivery', desc: 'Pay when you receive it' },
    { title: 'Free returns', desc: '14 days to change your mind' },
  ],
  trustMobile: ['48h delivery', 'Cash on delivery', '14-day returns', 'Secure'],
  reassurance: [
    { title: 'Secure payment', desc: 'Your transactions are protected end to end.' },
    { title: 'Fast delivery', desc: 'Shipped within 24h, delivered within 48h in every wilaya.' },
    { title: 'Support 7 days a week', desc: 'Got a question? Our team answers every day.' },
  ],
}

export default home
