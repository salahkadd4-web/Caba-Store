'use client'

import Link from 'next/link'
import CabaLogo from '@/components/CabaLogo'
import { usePathname } from 'next/navigation'
import { signOut }     from 'next-auth/react'
import { useState }    from 'react'
import {
  BarChart2, CreditCard, LayoutDashboard, LogOut, Package, RefreshCw,
  Settings, ShoppingCart, Store, Tag, TrendingUp, Users, X,
} from 'lucide-react'
import { APP_URL } from '@/lib/constants'

// ─── Nav items par rôle ────────────────────────────────────────────────────────

const adminNavItems = [
  { href: '/admin',             label: 'Tableau de bord', icon: BarChart2    },
  { href: '/admin/produits',    label: 'Produits',        icon: Package      },
  { href: '/admin/categories',  label: 'Catégories',      icon: Tag          },
  { href: '/admin/clients',     label: 'Clients',         icon: Users        },
  { href: '/admin/vendeurs',    label: 'Vendeurs',        icon: Store        },
  { href: '/admin/abonnements', label: 'Abonnements',     icon: CreditCard   },
  { href: '/commandes',         label: 'Commandes',       icon: ShoppingCart },
  { href: '/retours',           label: 'Retours',         icon: RefreshCw    },
  { href: '/admin/stats',       label: 'Statistiques',    icon: TrendingUp   },
]

const vendeurNavItems = [
  { href: '/vendeur',            label: 'Tableau de bord', icon: BarChart2    },
  { href: '/vendeur/produits',   label: 'Mes Produits',    icon: Package      },
  { href: '/vendeur/categories', label: 'Catégories',      icon: Tag          },
  { href: '/commandes',          label: 'Commandes',       icon: ShoppingCart },
  { href: '/retours',            label: 'Retours',         icon: RefreshCw    },
  { href: '/vendeur/abonnement', label: 'Abonnement',      icon: CreditCard   },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  role,
  nomBoutique,
  userName,
  sidebarOpen,
  onClose,
}: {
  role: 'ADMIN' | 'VENDEUR'
  nomBoutique?: string | null
  userName: string
  sidebarOpen: boolean
  onClose: () => void
}) {
  const pathname  = usePathname()
  const isAdmin   = role === 'ADMIN'
  const navItems  = isAdmin ? adminNavItems : vendeurNavItems

  // Couleurs d'accentuation selon le rôle
  const accentActive = isAdmin
    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
    : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400'
  const accentDot = isAdmin ? 'bg-purple-500' : 'bg-orange-500'
  const accentHover = isAdmin
    ? 'hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-purple-700 dark:hover:text-purple-300'
    : 'hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-orange-700 dark:hover:text-orange-400'
  const badgeCls = isAdmin
    ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900'
    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
  const badgeLabel = isAdmin ? 'Admin' : 'Vendeur'
  const RoleIcon = isAdmin ? Settings : Store

  const normalize = (p: string) => p.replace(/\/$/, '') || '/'
  const isActive  = (href: string) => normalize(pathname ?? '') === normalize(href)

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64
        bg-[#FAF7F2] dark:bg-stone-900
        border-r border-stone-200 dark:border-stone-800
        flex flex-col shadow-xl
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>

        {/* ── Header sidebar ── */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between safe-top shrink-0">
          <Link href="/" className="flex items-center gap-2 group" onClick={onClose}>
            <CabaLogo className="h-7 w-7 text-orange-700 dark:text-orange-400 transition-transform group-hover:scale-105" />
            <span className="text-base font-semibold tracking-tight text-stone-800 dark:text-stone-100">
              Caba<span className="text-orange-700 dark:text-orange-400">Store</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Badge rôle + utilisateur ── */}
        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-700 dark:bg-orange-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold">
                {userName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
                {userName}
              </p>
              {!isAdmin && nomBoutique && (
                <p className="text-xs text-stone-400 dark:text-stone-500 truncate leading-tight mt-0.5">
                  {nomBoutique}
                </p>
              )}
            </div>
            <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>
              <RoleIcon className="w-2.5 h-2.5" />
              {badgeLabel}
            </span>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon   = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]
                  ${active
                    ? `${accentActive} shadow-sm`
                    : `text-stone-600 dark:text-stone-400 ${accentHover}`
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {active && (
                  <span className={`w-1.5 h-1.5 rounded-full ${accentDot}`} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Bas sidebar ── */}
        <div className="px-3 py-3 border-t border-stone-200 dark:border-stone-800 shrink-0 space-y-1 safe-bottom">
          <Link
            href="/"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-100 transition-all active:scale-[0.98]"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Retour à la boutique</span>
          </Link>
        </div>
      </aside>
    </>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({
  role,
  navItems,
  userName,
  onMenuOpen,
}: {
  role: 'ADMIN' | 'VENDEUR'
  navItems: typeof adminNavItems
  userName: string
  onMenuOpen: () => void
}) {
  const pathname     = usePathname()
  const normalize    = (p: string) => p.replace(/\/$/, '') || '/'
  const currentItem  = navItems.find(i => normalize(i.href) === normalize(pathname ?? ''))
  const CurrentIcon  = currentItem?.icon

  const isAdmin = role === 'ADMIN'
  const pillCls = isAdmin
    ? 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900'
    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900'

  const handleSignOut = () => {
    signOut({ callbackUrl: `${APP_URL}/`, redirect: true })
  }

  return (
    <header className="bg-[#FAF7F2]/95 dark:bg-stone-900/95 backdrop-blur-sm border-b border-stone-200 dark:border-stone-800 sticky top-0 z-20 safe-top">
      <div className="flex items-center justify-between px-4 py-3 gap-3">

        {/* Gauche : burger + page courante */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuOpen}
            aria-label="Ouvrir le menu"
            className="lg:hidden p-2 -ml-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Fil d'ariane / page courante (mobile) */}
          {currentItem && (
            <div className="lg:hidden flex items-center gap-2 min-w-0">
              {CurrentIcon && <CurrentIcon className="w-4 h-4 shrink-0 text-stone-400" />}
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">
                {currentItem.label}
              </span>
            </div>
          )}
        </div>

        {/* Centre : Logo (desktop seulement) */}
        <Link href="/" className="hidden lg:flex items-center gap-2 group select-none shrink-0">
          <CabaLogo className="h-7 w-auto text-orange-700 dark:text-orange-400 transition-transform group-hover:scale-105" />
          <span className="text-base font-semibold tracking-tight text-stone-800 dark:text-stone-100">
            Caba<span className="text-orange-700 dark:text-orange-400">Store</span>
          </span>
        </Link>

        {/* Droite : badge rôle + user + déconnexion */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Badge rôle — desktop */}
          <span className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${pillCls}`}>
            {isAdmin ? <Settings className="w-3 h-3" /> : <Store className="w-3 h-3" />}
            {isAdmin ? 'Admin' : 'Vendeur'}
          </span>

          {/* Avatar + nom */}
          <div className="hidden sm:flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-full pl-1 pr-3 py-1">
            <div className="w-6 h-6 rounded-full bg-orange-700 dark:bg-orange-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">
                {userName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <span className="text-xs font-medium text-stone-700 dark:text-stone-200 max-w-24 truncate">
              {userName}
            </span>
          </div>

          {/* Boutique — desktop */}
          <Link
            href="/"
            className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-3 py-2 rounded-full border border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 transition-all active:scale-95 bg-white/60 dark:bg-stone-800/60"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Boutique</span>
          </Link>

          {/* Déconnexion */}
          <button
            onClick={handleSignOut}
            title="Déconnexion"
            aria-label="Déconnexion"
            className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 px-3 py-2 rounded-full border border-red-200 dark:border-red-900/60 hover:border-red-400 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Shell principal ──────────────────────────────────────────────────────────

export default function DashboardShell({
  role,
  nomBoutique,
  userName,
  children,
}: {
  role: 'ADMIN' | 'VENDEUR'
  nomBoutique?: string | null
  userName: string
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = role === 'ADMIN' ? adminNavItems : vendeurNavItems

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 transition-colors duration-300">
      <Sidebar
        role={role}
        nomBoutique={nomBoutique}
        userName={userName}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <TopBar
          role={role}
          navItems={navItems}
          userName={userName}
          onMenuOpen={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden safe-bottom">
          {children}
        </main>
      </div>
    </div>
  )
}
