'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { useIsMobile, useHideOnScroll } from '@/app/hooks/useIsMobile'
import SearchBar from '@/components/client/SearchBar'
import { Heart, LogOut, Menu, Package, RefreshCw, ShoppingCart, Store, User, X } from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://caba-store.vercel.app'

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

const userMenuItems = [
  { href: '/profil',    label: 'Mon Profil',   icon: User },
  { href: '/favoris',   label: 'Mes Favoris',  icon: Heart },
  { href: '/panier',    label: 'Mon Panier',    icon: ShoppingCart },
  { href: '/commandes', label: 'Mes Commandes', icon: Package },
  { href: '/retours',   label: 'Mes Retours',   icon: RefreshCw },
]

export default function Header() {
  // ── TOUS les hooks doivent être appelés avant tout return conditionnel ──
  const { data: session } = useSession()
  const router            = useRouter()
  const pathname          = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [search, setSearch]             = useState('')
  const [menuOpen, setMenuOpen]         = useState(false)
  const [cartCount, setCartCount]       = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)

 // ── Panier : count + écoute des mises à jour ──
  useEffect(() => {
      if (!session) { setCartCount(0); return }

      const fetchCount = async () => {
        try {
          const res  = await fetch('/api/panier/count')
          const data = await res.json()
          setCartCount(data.count ?? 0)
        } catch { setCartCount(0) }
      }

      fetchCount()

      // Même onglet : mis à jour depuis AddToCartButton / CartIconButton
      window.addEventListener('cart-updated', fetchCount)

      // Inter-onglets : BroadcastChannel (marche sur tous les navigateurs modernes)
      const channel = new BroadcastChannel('cart')
      channel.onmessage = fetchCount

      return () => {
        window.removeEventListener('cart-updated', fetchCount)
        channel.close()
      }
    }, [session])

  const isMobile    = useIsMobile()
  const hidden      = useHideOnScroll()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Masquer sur les pages /vendeur (le layout vendeur a son propre header) ──
  if (pathname?.startsWith('/vendeur')) return null

  // ── Masquer Header sur connexion / inscription en mobile (version APK) ──
  const isAuthPage = pathname?.startsWith('/connexion') || pathname?.startsWith('/inscription')
  if (isMobile && isAuthPage) return null

  const isVendeur = session?.user?.role === 'VENDEUR'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/produits?recherche=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  const handleGoogle = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser')
        const url = `${APP_URL}/api/auth/signin/google?callbackUrl=${encodeURIComponent(APP_URL + '/')}`
        await Browser.open({ url, windowName: '_self', presentationStyle: 'fullscreen', toolbarColor: '#000000' })
      } else {
        const { signIn } = await import('next-auth/react')
        await signIn('google', { callbackUrl: `${APP_URL}/` })
      }
    } catch (err) { console.error('Erreur Google:', err) }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: `${APP_URL}/`, redirect: true })
    setUserMenuOpen(false)
    setMenuOpen(false)
  }

  // ── Header Admin ───────────────────────────────────────────────────────────
  if (session?.user?.role === 'ADMIN') {
    return (
      <header className="bg-black text-white sticky top-0 z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/admin" className="text-sm font-light tracking-[0.4em] uppercase text-gray-300">Admin</Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-white text-xs uppercase tracking-widest transition-colors">Boutique</Link>
            <button onClick={handleSignOut} className="text-gray-400 hover:text-white text-xs uppercase tracking-widest transition-colors">Déconnexion</button>
          </div>
        </div>
      </header>
    )
  }

  // ── Header Mobile ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <header className={`bg-white dark:bg-gray-900 fixed top-0 left-0 right-0 z-50 border-b border-gray-200 dark:border-gray-800 transition-transform duration-300 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}>
        <div className="px-4 py-3 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-1">
            <span className="text-sm font-light tracking-[0.3em] uppercase text-black dark:text-white">Caba</span>
            <Image src="/logo_noir.png" alt="Logo" width={32} height={32} className="h-7 w-auto dark:invert" priority />
            <span className="text-sm font-light tracking-[0.3em] uppercase text-black dark:text-white -ml-1">Store</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Bouton Espace Vendeur → retour côté vendeur */}
            {isVendeur && (
              <Link href="/vendeur"
                className="flex items-center justify-center w-9 h-9 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full active:scale-95 transition-all">
                <Store className="w-4 h-4" />
              </Link>
            )}

            {session && cartCount > 0 && (
              <Link
                href="/panier"
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 active:scale-95"
                title="Mon panier"
              >
                <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md animate-bounce-once">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </Link>
            )}

            {session ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full pl-1 pr-2.5 py-1">
                  <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
                    <span className="text-white dark:text-gray-900 text-xs font-semibold">
                      {session.user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400"><ChevronDown open={userMenuOpen} /></span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{session.user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                    </div>
                    <div className="py-1">
                      {userMenuItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors uppercase tracking-widest">
                          <span>{(() => { const Icon = item.icon; return <Icon className="w-4 h-4" /> })()}</span><span>{item.label}</span>
                        </Link>
                      ))}
                      {isVendeur && (
                        <Link href="/vendeur" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors uppercase tracking-widest font-medium">
                          <span><Store className="w-5 h-5" /></span><span>Espace Vendeur</span>
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors">
                        <span><LogOut className="w-4 h-4" /></span><span className="text-xs uppercase tracking-widest">Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/connexion" className="bg-black dark:bg-white text-white dark:text-black text-xs uppercase tracking-widest px-4 py-2 rounded-full">
                Connexion
              </Link>
            )}
          </div>
        </div>
      </header>
    )
  }

  // ── Header Web — fixed + hide on scroll ───────────────────────────────────
  return (
    <>
      <div className="h-[65px]" />

      <header className={`
        bg-white dark:bg-gray-900 fixed top-0 left-0 right-0 z-50
        border-b border-gray-200 dark:border-gray-800
        transition-transform duration-300 ease-in-out
        ${hidden ? '-translate-y-full' : 'translate-y-0'}
      `}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">

          <button className="md:hidden text-black dark:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="shrink-0">
            <span className="flex items-center gap-x-2 text-lg font-light tracking-[0.4em] uppercase text-black dark:text-white">
              <span>Caba</span>
              <Image src="/logo_noir.png" alt="Caba Store Logo" width={50} height={50} className="h-8 w-auto block dark:invert" priority />
              <span className="-ml-1">Store</span>
            </span>
          </Link>

          <div className="flex items-center gap-6 flex-1">
            <nav className="hidden md:flex items-center gap-6 shrink-0">
              <Link href="/" className="nav-link text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white text-xs uppercase tracking-[0.2em] transition-colors">Accueil</Link>
              <Link href="/categories" className="nav-link text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white text-xs uppercase tracking-[0.2em] transition-colors">Catégories</Link>
              <Link href="/produits" className="nav-link text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white text-xs uppercase tracking-[0.2em] transition-colors">Produits</Link>
            </nav>
            <div className="flex-1 max-w-sm hidden md:flex items-center">
              <SearchBar />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Bouton Espace Vendeur visible en desktop */}
            {isVendeur && (
              <Link href="/vendeur"
                className="hidden md:flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all">
                <span><Store className="w-5 h-5" /></span>
                <span className="uppercase tracking-widest">Espace Vendeur</span>
              </Link>
            )}

            {/* ── Icône Panier avec badge ── */}
            {session && cartCount > 0 && (
              <Link
                href="/panier"
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 active:scale-95"
                title="Mon panier"
              >
                <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </Link>
            )}

            {session ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full pl-1 pr-3 py-1 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
                    <span className="text-white dark:text-gray-900 text-xs font-semibold">
                      {session.user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium hidden sm:block max-w-[80px] truncate">
                    {session.user?.name?.split(' ')[0]}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400"><ChevronDown open={userMenuOpen} /></span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-12 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{session.user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                    </div>
                    <div className="py-1">
                      {userMenuItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setUserMenuOpen(false)}
                          className="menu-link flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <span>{(() => { const Icon = item.icon; return <Icon className="w-4 h-4" /> })()}</span>
                          <span className="text-xs uppercase tracking-[0.15em]">{item.label}</span>
                        </Link>
                      ))}
                      {isVendeur && (
                        <Link href="/vendeur" onClick={() => setUserMenuOpen(false)}
                          className="menu-link flex items-center gap-3 px-4 py-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950">
                          <span><Store className="w-5 h-5" /></span>
                          <span className="text-xs uppercase tracking-[0.15em] font-medium">Espace Vendeur</span>
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                      <button onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors">
                        <span><LogOut className="w-4 h-4" /></span>
                        <span className="text-xs uppercase tracking-[0.15em]">Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/connexion" className="bg-black dark:bg-white dark:text-black text-white text-xs uppercase tracking-[0.2em] px-5 py-2.5 transition-colors">Connexion</Link>
            )}
          </div>
        </div>

        {/* Menu hamburger mobile */}
        {menuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-6 space-y-4">
            <form onSubmit={handleSearch} className="relative mb-4">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full border-b border-gray-300 focus:border-black outline-none py-2 pr-8 text-xs bg-transparent placeholder-gray-400 transition-colors" />
              <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            </form>
            {[
              { href: '/', label: 'Accueil' },
              { href: '/categories', label: 'Catégories' },
              { href: '/produits', label: 'Produits' },
              ...(session ? userMenuItems.map(i => ({ href: i.href, label: i.label })) : []),
            ].map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className="block text-gray-600 dark:text-gray-300 hover:text-black text-xs uppercase tracking-[0.2em] transition-colors">
                {item.label}
              </Link>
            ))}
            {isVendeur && (
              <Link href="/vendeur" onClick={() => setMenuOpen(false)}
                className="block text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-[0.2em] font-medium"><Store className="w-4 h-4 inline mr-1" />{' '}Espace Vendeur
              </Link>
            )}
            {session ? (
              <button onClick={handleSignOut} className="block text-red-500 text-xs uppercase tracking-[0.2em]">Déconnexion</button>
            ) : (
              <Link href="/connexion" onClick={() => setMenuOpen(false)}
                className="inline-block bg-black dark:bg-white text-white dark:text-black text-xs uppercase tracking-[0.2em] px-5 py-2.5 transition-colors">Connexion</Link>
            )}
          </div>
        )}
      </header>
    </>
  )
}