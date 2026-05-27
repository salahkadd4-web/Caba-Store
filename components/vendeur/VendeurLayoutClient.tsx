'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import VendeurDocumentsClient from './VendeurDocumentsClient'
import { Ban, BarChart2, CreditCard, Loader2, Package, RefreshCw, ShoppingCart, Store, Tag, X } from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://caba-store.vercel.app'

const navItems = [
  { href: '/vendeur',            label: 'Tableau de bord', icon: BarChart2 },
  { href: '/vendeur/produits',   label: 'Mes Produits',    icon: Package },
  { href: '/vendeur/categories', label: 'Catégories',      icon: Tag },
  { href: '/vendeur/commandes',  label: 'Commandes',       icon: ShoppingCart },
  { href: '/vendeur/retours',    label: 'Retours',         icon: RefreshCw },
  { href: '/vendeur/abonnement',  label: 'Abonnement',      icon: CreditCard },
]

interface Doc {
  id: string; type: string; label: string
  description: string | null; fichier: string | null
  statut: string; adminNote: string | null
}
interface VendeurForDocs { id: string; adminNote: string | null; documents: Doc[] }

interface Props {
  statut: string
  adminNote: string | null
  nomBoutique: string | null
  vendeurForDocs: VendeurForDocs | null
  children: React.ReactNode
}

// ── Header minimal Vendeur ─────────────────────────────────────────────────────
function VendeurTopBar({
  onMenuOpen,
  showMenuButton,
}: {
  onMenuOpen: () => void
  showMenuButton: boolean
}) {
  const handleSignOut = () => {
    signOut({ callbackUrl: `${APP_URL}/`, redirect: true })
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm safe-top">
      <div className="flex items-center justify-between px-4 py-3">

        {/* Gauche : hamburger (mobile, uniquement si sidebar dispo) + logo */}
        <div className="flex items-center gap-2">
          {showMenuButton && (
            <button
              onClick={onMenuOpen}
              aria-label="Ouvrir le menu"
              className="lg:hidden p-2 -ml-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          )}

          {/* CABA STORE logo → lien vers la boutique */}
          <Link
            href="/"
            className="flex items-center gap-1 group select-none"
            title="Retour à la boutique"
          >
            <span className="text-sm font-light tracking-[0.25em] uppercase text-black dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Caba
            </span>
            <Image
              src="/logo_noir.png"
              alt="Caba Store"
              width={28}
              height={28}
              className="h-6 w-auto dark:invert"
              priority
            />
            <span className="text-sm font-light tracking-[0.25em] uppercase text-black dark:text-white -ml-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Store
            </span>
          </Link>
        </div>

        {/* Droite : Boutique + Déconnexion */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all active:scale-95"
          >
            {/* Icône maison */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="hidden sm:inline tracking-widest uppercase font-medium">Boutique</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900 hover:border-red-400 dark:hover:border-red-700 transition-all active:scale-95"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="hidden sm:inline tracking-widest uppercase font-medium">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  )
}

// ── Page de statut (EN_ATTENTE / SUSPENDU) ─────────────────────────────────────
function StatusPage({ statut, adminNote }: { statut: string; adminNote: string | null }) {
  const isAttente = statut === 'EN_ATTENTE'

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
        {/* Bande colorée en haut */}
        <div className={`h-1.5 w-full ${isAttente ? 'bg-yellow-400' : 'bg-red-500'}`} />

        <div className="p-8 text-center">
          {/* Icône */}
          <div className={`
            w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center text-4xl
            ${isAttente
              ? 'bg-yellow-50 dark:bg-yellow-950'
              : 'bg-red-50 dark:bg-red-950'
            }
          `}>
            {isAttente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-5 h-5" />}
          </div>

          {/* Titre */}
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            {isAttente ? 'Compte en attente de validation' : 'Compte suspendu'}
          </h1>

          {/* Description */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
            {isAttente
              ? "Votre demande d'inscription en tant que vendeur est en cours d'examen. Notre équipe vous contactera prochainement."
              : "Votre compte vendeur a été suspendu. Contactez le support pour plus d'informations."
            }
          </p>

          {/* Note admin */}
          {adminNote && (
            <div className={`
              text-xs rounded-xl p-4 mb-5 text-left
              ${isAttente
                ? 'bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border border-yellow-100 dark:border-yellow-900'
                : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-100 dark:border-red-900'
              }
            `}>
              <p className="font-semibold mb-1">
                {isAttente ? 'Message de l\'équipe :' : 'Motif de suspension :'}
              </p>
              <p className="leading-relaxed">{adminNote}</p>
            </div>
          )}

          {/* Lien retour boutique */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
            </svg>
            Retour à la boutique
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Layout principal (APPROUVE) ────────────────────────────────────────────────
function ApprouveLayout({
  children,
  nomBoutique,
  sidebarOpen,
  onMenuOpen,
  onMenuClose,
}: {
  children: React.ReactNode
  nomBoutique: string | null
  sidebarOpen: boolean
  onMenuOpen: () => void
  onMenuClose: () => void
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors duration-300">

      {/* Overlay sidebar mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onMenuClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        shadow-xl transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* En-tête sidebar */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between safe-top">
          <div>
            <h1 className="text-sm font-bold text-emerald-600 dark:text-emerald-400"><Store className="w-4 h-4 inline mr-1" />{' '}Espace Vendeur</h1>
            {nomBoutique && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-40">{nomBoutique}</p>
            )}
          </div>
          <button
            onClick={onMenuClose}
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          ><X className="w-4 h-4" /></button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-130px)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMenuClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  active:scale-[0.98]
                  ${isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <span className="shrink-0">{(() => { const Icon = item.icon; return <Icon className="w-5 h-5" /> })()}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bas sidebar : retour boutique */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 dark:border-gray-800 safe-bottom">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Retour à la boutique
          </Link>
        </div>
      </aside>

      {/* Zone principale */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar avec CABA STORE header + burger */}
        <VendeurTopBar onMenuOpen={onMenuOpen} showMenuButton={true} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden safe-bottom">
          {children}
        </main>
      </div>
    </div>
  )
}

// ── Composant racine exporté ───────────────────────────────────────────────────
export default function VendeurLayoutClient({
  statut,
  adminNote,
  nomBoutique,
  vendeurForDocs,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── Compte en attente ou suspendu ─────────────────
  if (statut === 'EN_ATTENTE' || statut === 'SUSPENDU') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <VendeurTopBar onMenuOpen={() => {}} showMenuButton={false} />
        <StatusPage statut={statut} adminNote={adminNote} />
      </div>
    )
  }

  // ── Pièces requises → upload documents ─────────────
  if (statut === 'PIECES_REQUISES' && vendeurForDocs) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <VendeurTopBar onMenuOpen={() => {}} showMenuButton={false} />
        <div className="flex-1 p-4 md:p-6">
          <VendeurDocumentsClient vendeur={vendeurForDocs} />
        </div>
      </div>
    )
  }

  // ── Compte approuvé → layout complet ──────────────
  return (
    <ApprouveLayout
      nomBoutique={nomBoutique}
      sidebarOpen={sidebarOpen}
      onMenuOpen={() => setSidebarOpen(true)}
      onMenuClose={() => setSidebarOpen(false)}
    >
      {children}
    </ApprouveLayout>
  )
}