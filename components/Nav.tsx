'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import CabaLogo from '@/components/CabaLogo'
import SearchBar from '@/components/client/SearchBar'
import {
  Heart, LayoutDashboard, LogOut, Menu, Package, RefreshCw,
  ShoppingCart, Store, User, X,
} from 'lucide-react'
import { APP_URL } from '@/lib/constants'

const navItems = [
  { href: '/',           label: 'Accueil' },
  { href: '/categories', label: 'Catégories' },
  { href: '/produits',   label: 'Produits' },
]

const userMenuItems = [
  { href: '/profil',    label: 'Mon Profil',    icon: User },
  { href: '/favoris',   label: 'Mes Favoris',   icon: Heart },
  { href: '/panier',    label: 'Mon Panier',    icon: ShoppingCart },
  { href: '/commandes', label: 'Mes Commandes', icon: Package },
  { href: '/retours',   label: 'Mes Retours',   icon: RefreshCw },
]

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function Nav() {
  const { data: session, status } = useSession()
  const router            = useRouter()
  const pathname          = usePathname()
  const userMenuRef       = useRef<HTMLDivElement>(null)

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [search,       setSearch]       = useState('')
  const [cartCount,    setCartCount]    = useState(0)

  // ── Panier : count + écoute des mises à jour ──
  useEffect(() => {
    if (!session) return
    const fetchCount = async () => {
      try {
        const res  = await fetch('/api/panier/count')
        const data = await res.json()
        setCartCount(data.count ?? 0)
      } catch { setCartCount(0) }
    }
    fetchCount()
    window.addEventListener('cart-updated', fetchCount)
    const channel = new BroadcastChannel('cart')
    channel.onmessage = fetchCount
    return () => {
      window.removeEventListener('cart-updated', fetchCount)
      channel.close()
      setCartCount(0)
    }
  }, [session])

  // Click outside → close user dropdown
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Masquer sur les pages dashboard (admin/vendeur ont leur propre TopBar)
  // et sur les pages d'authentification
  if (pathname?.startsWith('/admin'))       return null
  if (pathname?.startsWith('/vendeur'))     return null
  if (pathname?.startsWith('/commandes') && (session?.user?.role === 'ADMIN' || session?.user?.role === 'VENDEUR')) return null
  if (pathname?.startsWith('/retours')   && (session?.user?.role === 'ADMIN' || session?.user?.role === 'VENDEUR')) return null
  const isAuthPage = pathname?.startsWith('/connexion') || pathname?.startsWith('/inscription')
  if (isAuthPage) return null

  const isVendeur = session?.user?.role === 'VENDEUR'
  const isAdmin   = session?.user?.role === 'ADMIN'
  const isClient  = !!session && !isVendeur && !isAdmin

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/produits?recherche=${encodeURIComponent(search.trim())}`)
      setSearch('')
      setMenuOpen(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: `${APP_URL}/`, redirect: true })
    setUserMenuOpen(false)
    setMenuOpen(false)
  }

  return (
    <>
      <div className="h-16" />

      <header className="bg-[#FAF7F2]/95 dark:bg-stone-900/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4 md:gap-6">

          {/* Burger mobile */}
          <button
            className="md:hidden text-stone-800 dark:text-stone-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-2 group">
            <CabaLogo className="h-8 w-8 md:h-9 md:w-9 text-orange-700 dark:text-orange-400 transition-transform group-hover:scale-105" />
            <span className="text-base md:text-lg font-semibold tracking-tight text-stone-800 dark:text-stone-100">
              Caba<span className="text-orange-700 dark:text-orange-400">Store</span>
            </span>
          </Link>

          {/* Nav links + recherche (desktop) */}
          <div className="hidden md:flex items-center gap-6 flex-1">
            <nav className="flex items-center gap-1 shrink-0">
              {navItems.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? 'text-orange-700 dark:text-orange-400'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {item.label}
                    {active && (
                      <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 bg-orange-700 dark:bg-orange-400 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>
            <div className="flex-1 max-w-sm flex items-center">
              <SearchBar />
            </div>
          </div>

          {/* Actions à droite (toutes tailles) */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-auto">

            {/* Pill Dashboard Admin */}
            {isAdmin && (
              <Link
                href="/admin"
                title="Dashboard admin"
                aria-label="Dashboard admin"
                className="flex items-center gap-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 px-2.5 md:px-3 py-2 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden md:inline">Dashboard</span>
              </Link>
            )}

            {/* Pill Espace Vendeur */}
            {isVendeur && (
              <Link
                href="/vendeur"
                title="Dashboard vendeur"
                aria-label="Dashboard vendeur"
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2.5 md:px-3 py-2 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
              >
                <Store className="w-4 h-4" />
                <span className="hidden md:inline">Dashboard</span>
              </Link>
            )}

            {/* Raccourcis client connecté */}
            {isClient && (
              <>
                <IconLink href="/favoris" title="Mes favoris">
                  <Heart className="w-4 h-4" />
                </IconLink>
                <IconLink href="/commandes" title="Mes commandes">
                  <Package className="w-4 h-4" />
                </IconLink>
              </>
            )}

            {/* Panier */}
            {session && (isClient || cartCount > 0) && (
              <Link
                href="/panier"
                title="Mon panier"
                aria-label="Mon panier"
                className="relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all active:scale-95"
              >
                <ShoppingCart className="w-4 h-4 text-stone-700 dark:text-stone-200" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 bg-orange-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* User menu ou bouton connexion */}
            {status === 'loading' ? (
              <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 animate-pulse" />
            ) : session ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 md:gap-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full pl-1 pr-2.5 md:pr-3 py-1 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-orange-700 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {session.user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <span className="hidden sm:block text-xs text-stone-700 dark:text-stone-200 font-medium max-w-20 truncate">
                    {session.user?.name?.split(' ')[0]}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">
                    <ChevronDown open={userMenuOpen} />
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-orange-50/50 dark:bg-orange-950/20">
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{session.user?.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{session.user?.email}</p>
                    </div>
                    <div className="py-1">
                      {userMenuItems.map(item => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-orange-50 dark:hover:bg-stone-800 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                      {isVendeur && (
                        <Link
                          href="/vendeur"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                        >
                          <Store className="w-4 h-4" />
                          <span>Dashboard vendeur</span>
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          <span>Dashboard admin</span>
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-stone-100 dark:border-stone-800 py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/connexion"
                className="bg-orange-700 hover:bg-orange-800 text-white text-sm font-medium px-4 md:px-5 py-2 md:py-2.5 rounded-full transition-colors shadow-sm"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>

        {/* Menu hamburger mobile (panneau dépliant) */}
        {menuOpen && (
          <div className="md:hidden bg-[#FAF7F2] dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 px-4 py-4 space-y-2">
            <form onSubmit={handleSearch} className="relative mb-3">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full border border-stone-300 dark:border-stone-700 focus:border-orange-700 dark:focus:border-orange-400 outline-none py-2.5 pl-4 pr-10 text-sm rounded-full bg-white dark:bg-stone-800 placeholder-stone-400"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-700" aria-label="Rechercher">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            </form>
            {navItems.map(item => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            {session && userMenuItems.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
              {session ? (
                <button onClick={handleSignOut} className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                  Déconnexion
                </button>
              ) : (
                <Link href="/connexion" onClick={() => setMenuOpen(false)} className="inline-block bg-orange-700 hover:bg-orange-800 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors">
                  Connexion
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  )
}

function IconLink({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-orange-700 dark:hover:text-orange-400 transition-colors active:scale-95"
    >
      {children}
    </Link>
  )
}
