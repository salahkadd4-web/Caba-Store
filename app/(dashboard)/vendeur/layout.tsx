/**
 * layout.tsx — Garde de sécurité pour toutes les routes /vendeur/*
 *
 * Ce Server Component s'exécute avant chaque page vendeur et vérifie
 * que le vendeur est bien APPROUVÉ. Si ce n'est pas le cas, il affiche
 * un écran de blocage avec un message adapté au statut (EN_ATTENTE,
 * SUSPENDU) ou le formulaire d'upload (PIECES_REQUISES).
 *
 * ⚠️  Ce layout s'imbrique dans (dashboard)/layout.tsx qui fournit
 *     le DashboardShell (sidebar + header vendeur). Le message de blocage
 *     s'affiche donc dans la zone principale du dashboard — cohérent avec
 *     l'expérience attendue.
 */

import { auth }     from '@/auth'
import { redirect } from 'next/navigation'
import { prisma }   from '@/lib/prisma'
import Link         from 'next/link'
import {
  Clock, ShieldOff, ArrowLeft, Mail,
} from 'lucide-react'
import VendeurDocumentsClient from '@/components/vendeur/VendeurDocumentsClient'
import { getI18n } from '@/lib/i18n/server'

// ─── Configuration par statut (EN_ATTENTE + SUSPENDU uniquement) ──────────────
// Textes : t.seller.status[statut]

const STATUT_CONFIG = {
  EN_ATTENTE: {
    Icon:        Clock,
    iconBg:      'bg-amber-100 dark:bg-amber-900/50',
    iconColor:   'text-amber-600 dark:text-amber-400',
    cardBg:      'bg-amber-50 dark:bg-amber-950/20',
    cardBorder:  'border-amber-200 dark:border-amber-800/60',
    badgeCls:    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  },
  SUSPENDU: {
    Icon:        ShieldOff,
    iconBg:      'bg-red-100 dark:bg-red-900/50',
    iconColor:   'text-red-600 dark:text-red-400',
    cardBg:      'bg-red-50 dark:bg-red-950/20',
    cardBorder:  'border-red-200 dark:border-red-800/60',
    badgeCls:    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  },
} as const

type SimpleStatut = keyof typeof STATUT_CONFIG

// ─── Layout guard ─────────────────────────────────────────────────────────────

export default async function VendeurLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, { t }] = await Promise.all([auth(), getI18n()])

  // Double vérification (le middleware gère déjà cela, mais on sécurise côté serveur)
  if (!session?.user || session.user.role !== 'VENDEUR') {
    redirect('/connexion')
  }

  const vendeur = await prisma.vendeurProfile.findUnique({
    where:  { userId: session.user.id },
    select: {
      id:          true,
      statut:      true,
      nomBoutique: true,
      adminNote:   true,
      documents:   {
        select: {
          id:          true,
          type:        true,
          label:       true,
          description: true,
          fichier:     true,
          statut:      true,
          adminNote:   true,
        },
      },
    },
  })

  // ── Accès autorisé ────────────────────────────────────────────────────────
  if (vendeur?.statut === 'APPROUVE') {
    return <>{children}</>
  }

  // ── Pièces requises → formulaire d'upload ─────────────────────────────────
  if (vendeur?.statut === 'PIECES_REQUISES') {
    return (
      <VendeurDocumentsClient
        vendeur={{
          id:        vendeur.id,
          adminNote: vendeur.adminNote,
          documents: vendeur.documents,
        }}
      />
    )
  }

  // ── Accès bloqué : affichage du message adapté (EN_ATTENTE / SUSPENDU) ────
  const statut: SimpleStatut = vendeur?.statut && vendeur.statut in STATUT_CONFIG ? vendeur.statut as SimpleStatut : 'EN_ATTENTE'
  const cfg    = STATUT_CONFIG[statut]
  const txt    = t.seller.status[statut]
  const s      = t.seller.status
  const { Icon } = cfg

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 py-8">
      <div
        className={`
          w-full max-w-lg rounded-2xl border p-8 text-center
          ${cfg.cardBg} ${cfg.cardBorder}
        `}
      >
        {/* ── Icône ── */}
        <div
          className={`
            w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5
            ${cfg.iconBg}
          `}
        >
          <Icon className={`w-8 h-8 ${cfg.iconColor}`} />
        </div>

        {/* ── Badge statut ── */}
        <span
          className={`
            inline-flex items-center gap-1.5 text-xs font-semibold
            px-3 py-1 rounded-full border mb-4
            ${cfg.badgeCls}
          `}
        >
          {txt.badge}
        </span>

        {/* ── Titre ── */}
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-3">
          {txt.title}
        </h1>

        {/* ── Description ── */}
        <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
          {txt.description}
        </p>

        {/* ── Note de l'admin (si présente) ── */}
        {vendeur?.adminNote && (
          <div className="
            bg-white/70 dark:bg-stone-900/50
            border border-stone-200 dark:border-stone-700
            rounded-xl p-4 mb-4 text-start
          ">
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 mb-1 uppercase tracking-wider">
              {s.adminMessage}
            </p>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
              {vendeur.adminNote}
            </p>
          </div>
        )}

        {/* ── Boutique ── */}
        {vendeur?.nomBoutique && (
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">
            {s.shop} <span className="font-semibold">{vendeur.nomBoutique}</span>
          </p>
        )}

        {/* ── Conseil ── */}
        <p className="text-xs text-stone-400 dark:text-stone-500 mb-7 leading-relaxed">
          {txt.tip}
        </p>

        {/* ── Actions ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="
              flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
              bg-white dark:bg-stone-800
              border border-stone-200 dark:border-stone-700
              text-stone-700 dark:text-stone-200
              hover:bg-stone-50 dark:hover:bg-stone-700
              transition-all active:scale-95
            "
          >
            <ArrowLeft className="w-4 h-4 rtl-flip" />
            {s.backToShop}
          </Link>
          <a
            href="mailto:cabastoredz31@gmail.com"
            className="
              flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
              bg-orange-700 hover:bg-orange-800 text-white
              transition-all active:scale-95
            "
          >
            <Mail className="w-4 h-4" />
            {s.contactSupport}
          </a>
        </div>
      </div>
    </div>
  )
}