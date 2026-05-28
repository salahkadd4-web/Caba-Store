import { auth }          from '@/auth'
import { redirect }      from 'next/navigation'
import { prisma }        from '@/lib/prisma'
import DashboardShell    from '@/components/dashboard/DashboardShell'
import Link              from 'next/link'
import { Clock, ShieldOff, FileWarning, ArrowLeft, Mail } from 'lucide-react'

const STATUT_CONFIG = {
  EN_ATTENTE: {
    Icon: Clock,
    badge: 'En attente de validation',
    title: "Compte en cours d'examen",
    description: "Votre dossier vendeur a bien été reçu et est en cours d'examen par notre équipe. Vous serez notifié dès qu'une décision sera prise.",
    tip: '⏱ Ce processus prend généralement 1 à 3 jours ouvrés.',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    cardBg: 'bg-amber-50 dark:bg-amber-950/20',
    cardBorder: 'border-amber-200 dark:border-amber-800/60',
    badgeCls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  },
  SUSPENDU: {
    Icon: ShieldOff,
    badge: 'Compte suspendu',
    title: 'Votre accès vendeur est suspendu',
    description: "Votre compte vendeur a été suspendu par l'administration. Cette décision peut être temporaire. Contactez le support pour plus d'informations.",
    tip: '📋 Munissez-vous de votre numéro de compte lors de votre prise de contact.',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
    iconColor: 'text-red-600 dark:text-red-400',
    cardBg: 'bg-red-50 dark:bg-red-950/20',
    cardBorder: 'border-red-200 dark:border-red-800/60',
    badgeCls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  },
  PIECES_REQUISES: {
    Icon: FileWarning,
    badge: 'Documents requis',
    title: 'Pièces justificatives manquantes',
    description: "Des documents supplémentaires sont nécessaires pour finaliser la validation de votre compte vendeur. Veuillez contacter l'administration pour soumettre les pièces demandées.",
    tip: '📎 Préparez les documents officiels relatifs à votre activité commerciale.',
    iconBg: 'bg-orange-100 dark:bg-orange-900/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
    cardBg: 'bg-orange-50 dark:bg-orange-950/20',
    cardBorder: 'border-orange-200 dark:border-orange-800/60',
    badgeCls: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
  },
} as const

type VendeurStatut = keyof typeof STATUT_CONFIG

function VendeurBlocked({ vendeur }: { vendeur: { statut: string; nomBoutique: string | null; adminNote: string | null } }) {
  const statut = (vendeur.statut ?? 'EN_ATTENTE') as VendeurStatut
  const cfg    = STATUT_CONFIG[statut] ?? STATUT_CONFIG.EN_ATTENTE
  const { Icon } = cfg

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 py-8">
      <div className={`w-full max-w-lg rounded-2xl border p-8 text-center ${cfg.cardBg} ${cfg.cardBorder}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${cfg.iconBg}`}>
          <Icon className={`w-8 h-8 ${cfg.iconColor}`} />
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border mb-4 ${cfg.badgeCls}`}>
          {cfg.badge}
        </span>
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-3">{cfg.title}</h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-4">{cfg.description}</p>
        {vendeur.adminNote && (
          <div className="bg-white/70 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl p-4 mb-4 text-left">
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 mb-1 uppercase tracking-wider">Message de l&apos;administration</p>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{vendeur.adminNote}</p>
          </div>
        )}
        {vendeur.nomBoutique && (
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">
            Boutique : <span className="font-semibold">{vendeur.nomBoutique}</span>
          </p>
        )}
        <p className="text-xs text-stone-400 dark:text-stone-500 mb-7 leading-relaxed">{cfg.tip}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all active:scale-95">
            <ArrowLeft className="w-4 h-4" />
            Retour à la boutique
          </Link>
          <a href="mailto:cabastoredz31@gmail.com" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-700 hover:bg-orange-800 text-white transition-all active:scale-95">
            <Mail className="w-4 h-4" />
            Contacter le support
          </a>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default async function RetoursLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const role = session.user.role as string

  if (role === 'VENDEUR') {
    const nomBoutique = (session.user as { nomBoutique?: string }).nomBoutique ?? null

    const vendeur = await prisma.vendeurProfile.findUnique({
      where:  { userId: session.user.id },
      select: { statut: true, nomBoutique: true, adminNote: true },
    })

    if (vendeur?.statut !== 'APPROUVE') {
      return (
        <DashboardShell role="VENDEUR" nomBoutique={nomBoutique} userName={session.user.name ?? ''}>
          <VendeurBlocked vendeur={{ statut: vendeur?.statut ?? 'EN_ATTENTE', nomBoutique: vendeur?.nomBoutique ?? null, adminNote: vendeur?.adminNote ?? null }} />
        </DashboardShell>
      )
    }

    return (
      <DashboardShell role="VENDEUR" nomBoutique={nomBoutique} userName={session.user.name ?? ''}>
        {children}
      </DashboardShell>
    )
  }

  if (role === 'ADMIN') {
    const nomBoutique = (session.user as { nomBoutique?: string }).nomBoutique ?? null
    return (
      <DashboardShell role="ADMIN" nomBoutique={nomBoutique} userName={session.user.name ?? ''}>
        {children}
      </DashboardShell>
    )
  }

  // CLIENT
  return <>{children}</>
}