'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BarChart2, CreditCard, Package, RefreshCw, Settings, ShoppingCart, Store, Tag, TrendingUp, Users, X } from 'lucide-react'

const navItems = [
  { href: '/admin',            label: 'Tableau de bord', icon: BarChart2 },
  { href: '/admin/produits',   label: 'Produits',        icon: Package },
  { href: '/admin/categories', label: 'Catégories',      icon: Tag },
  { href: '/admin/clients',    label: 'Clients',         icon: Users },
  { href: '/admin/vendeurs',   label: 'Vendeurs',        icon: Store },  // ← NOUVEAU
  { href: '/admin/abonnements',   label: 'Abonnements',     icon: CreditCard },
  { href: '/admin/commandes',  label: 'Commandes',       icon: ShoppingCart },
  { href: '/admin/retours',    label: 'Retours',         icon: RefreshCw },
  { href: '/admin/stats',      label: 'Statistiques',    icon: TrendingUp },  // ← NOUVEAU
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors duration-300">

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        shadow-xl
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h1 className="text-base font-bold text-purple-600 dark:text-purple-400"><Settings className="w-4 h-4 inline mr-1" />{' '}Admin Panel</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          ><X className="w-4 h-4" /></button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-64px)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="shrink-0">{(() => { const Icon = item.icon; return <Icon className="w-5 h-5" /> })()}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 lg:hidden">
            {navItems.find(i => i.href === pathname)?.label || 'Admin'}
          </p>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition hidden sm:block">
              ← Boutique
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}