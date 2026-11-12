/**
 * lib/seller-billing.ts
 * ---------------------
 * Facturation des vendeurs côté serveur : ventes livrées d'un cycle, état de
 * facturation affiché (vendeur et admin), choix d'offre, confirmation de paiement.
 * Les offres et tarifs sont dans lib/billing-offers.ts ; le traitement quotidien
 * (clôture des cycles, rappels, blocage) dans lib/billing-cron.ts.
 */

import 'server-only'
import type { Prisma, Facture, Abonnement } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import {
  OFFRE_INITIALE, PRIORITE_BLOQUE,
  addMonths, arrondi, joursAvant, numeroFacture, prioriteDuNiveau, tauxCommission,
  type DureeForfait, type ModeFacturation, type NiveauVendeur,
} from '@/lib/billing-offers'

type Db = Prisma.TransactionClient | typeof prisma

/** Ventes livrées d'un vendeur sur [debut, fin[ (prix des articles, hors livraison, hors retours acceptés). */
export async function ventesLivrees(db: Db, vendeurId: string, debut: Date, fin: Date) {
  const rows = await db.$queryRaw<Array<{ brut: number | null; commandes: number | null }>>`
    SELECT
      COALESCE(SUM(oi.prix * oi.quantite), 0)::float AS brut,
      COUNT(DISTINCT oi."orderId")::int AS commandes
    FROM "OrderItem" oi
    JOIN "Product" p ON p.id = oi."productId"
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE p."vendeurId" = ${vendeurId}
      AND o.statut = 'LIVREE'
      AND o."livreeLe" >= ${debut}
      AND o."livreeLe" < ${fin}
      -- Retour accepté : l'article retourné (ou toute la commande si aucun produit précisé) ne compte pas.
      AND NOT EXISTS (
        SELECT 1 FROM "ReturnRequest" rr
        WHERE rr."orderId" = o.id
          AND rr.status = 'APPROVED'
          AND (rr."productId" IS NULL OR rr."productId" = oi."productId")
      )
  `
  return { ventesBrutes: rows[0]?.brut ?? 0, nbCommandes: rows[0]?.commandes ?? 0 }
}

/** Date à laquelle l'offre choisie prendra effet (fin de cycle, ou fin du forfait en cours). */
export function dateEffetProchaineOffre(abo: Pick<Abonnement, 'mode' | 'dateFin' | 'forfaitFin'>): Date {
  let d = new Date(abo.dateFin)
  if (abo.mode === 'FORFAIT' && abo.forfaitFin) {
    for (let i = 0; i < 24 && d < abo.forfaitFin; i++) d = addMonths(d, 1)
  }
  return d
}

export type FactureVue = ReturnType<typeof serialiserFacture>

export function serialiserFacture(f: Facture & { paiement?: { methode: string; reference: string | null; note: string | null } | null }) {
  return {
    id: f.id,
    numero: numeroFacture(f.id, f.emiseLe ?? f.createdAt),
    type: f.type,
    mode: f.type,
    niveau: f.niveau,
    periodicite: f.periodicite,
    taux: f.taux,
    ventesBrutes: f.ventesBrutes,
    nbCommandes: f.nbCommandes,
    montant: f.montant,
    avoirDeduit: f.avoirDeduit,
    periodeDebut: f.periodeDebut.toISOString(),
    periodeFin: f.periodeFin.toISOString(),
    statut: f.statut,
    emiseLe: f.emiseLe?.toISOString() ?? null,
    echeance: f.echeance?.toISOString() ?? null,
    payeeLe: f.payeeLe?.toISOString() ?? null,
    methode: f.paiement?.methode ?? null,
    reference: f.paiement?.reference ?? null,
    // Les paiements antérieurs stockaient la facture en JSON dans la note : on ne l'affiche pas.
    note: f.paiement?.note && !f.paiement.note.startsWith('__SELLER_INVOICE__') ? f.paiement.note : null,
  }
}

/**
 * État de facturation d'un vendeur, prêt à afficher : offre, cycle en cours,
 * commission qui s'accumule, factures à payer, historique.
 */
export async function getEtatFacturation(vendeurId: string, now = new Date()) {
  const abo = await prisma.abonnement.findUnique({
    where: { vendeurId },
    include: {
      factures: {
        orderBy: { periodeDebut: 'desc' },
        take: 36,
        include: { paiement: { select: { methode: true, reference: true, note: true } } },
      },
    },
  })
  if (!abo) return null

  const commissionEnCours = abo.mode === 'COMMISSION' && abo.niveau !== 'NIVEAU_0'
    ? await (async () => {
        const v = await ventesLivrees(prisma, vendeurId, abo.dateDebut, abo.dateFin)
        const taux = tauxCommission(abo.niveau)
        return { ...v, taux, montant: arrondi(v.ventesBrutes * taux) }
      })()
    : null

  const factures = abo.factures.map(serialiserFacture)
  const aPayer = factures
    .filter(f => f.statut === 'EN_ATTENTE')
    .sort((a, b) => (a.echeance ?? '').localeCompare(b.echeance ?? ''))
  const prochaineEcheance = aPayer[0]?.echeance ?? null

  return {
    id: abo.id,
    mode: abo.mode,
    niveau: abo.niveau,
    statut: abo.statut,
    avoir: abo.avoir,
    periodicite: abo.periodicite,
    cycleDebut: abo.dateDebut.toISOString(),
    cycleFin: abo.dateFin.toISOString(),
    forfaitFin: abo.forfaitFin?.toISOString() ?? null,
    prochaineOffre: abo.prochainMode
      ? {
          mode: abo.prochainMode,
          niveau: abo.prochainNiveau ?? abo.niveau,
          periodicite: abo.prochainePeriodicite,
          dateEffet: dateEffetProchaineOffre(abo).toISOString(),
        }
      : null,
    dateEffetChangement: dateEffetProchaineOffre(abo).toISOString(),
    commissionEnCours,
    aPayer,
    totalAPayer: arrondi(aPayer.reduce((s, f) => s + f.montant, 0)),
    prochaineEcheance,
    joursRestants: prochaineEcheance ? joursAvant(prochaineEcheance, now) : null,
    forfaitAVenir: factures.find(f => f.statut === 'A_VENIR') ?? null,
    historique: factures.filter(f => f.statut === 'PAYEE' || f.statut === 'ANNULEE'),
  }
}

export type EtatFacturation = NonNullable<Awaited<ReturnType<typeof getEtatFacturation>>>

/** Bandeau du tableau de bord vendeur : ce qu'il doit et avant quand (null s'il est à jour). */
export async function getRappelPaiement(vendeurId: string, now = new Date()) {
  const abo = await prisma.abonnement.findUnique({
    where: { vendeurId },
    select: {
      statut: true,
      factures: {
        where: { statut: 'EN_ATTENTE' },
        select: { montant: true, echeance: true },
        orderBy: { echeance: 'asc' },
      },
    },
  })
  if (!abo || abo.factures.length === 0) return null
  const echeance = abo.factures[0].echeance
  return {
    bloque: abo.statut === 'BLOQUE',
    total: arrondi(abo.factures.reduce((s, f) => s + f.montant, 0)),
    echeance: echeance?.toISOString() ?? null,
    joursRestants: echeance ? joursAvant(echeance, now) : 0,
  }
}

/** Abonnement d'un vendeur qui vient d'être approuvé : commission Niveau 4, premier cycle d'un mois. */
export function donneesAbonnementInitial(vendeurId: string, now = new Date()) {
  return {
    vendeurId,
    mode: OFFRE_INITIALE.mode,
    niveau: OFFRE_INITIALE.niveau,
    statut: 'ACTIF' as const,
    dateDebut: now,
    dateFin: addMonths(now, 1),
  }
}

/** Enregistre l'offre choisie ; elle s'applique au prochain cycle (ou à la fin du forfait). */
export async function choisirOffre(
  vendeurId: string,
  offre: { mode: ModeFacturation; niveau: NiveauVendeur; periodicite: DureeForfait | null },
) {
  const abo = await prisma.abonnement.findUnique({ where: { vendeurId } })
  if (!abo) return null

  // Même offre que l'actuelle (hors renouvellement d'un forfait de durée différente) → on annule le choix.
  const identique = abo.mode === offre.mode && abo.niveau === offre.niveau &&
    (offre.mode === 'COMMISSION' || abo.periodicite === offre.periodicite)

  return prisma.abonnement.update({
    where: { id: abo.id },
    data: identique
      ? { prochainMode: null, prochainNiveau: null, prochainePeriodicite: null }
      : {
          prochainMode: offre.mode,
          prochainNiveau: offre.niveau,
          prochainePeriodicite: offre.mode === 'FORFAIT' ? offre.periodicite ?? 'mensuel' : null,
        },
  })
}

/**
 * L'admin confirme le règlement d'une facture (en attente, ou forfait payé d'avance).
 * Si plus aucune facture n'est en retard, le vendeur bloqué est débloqué.
 */
export async function confirmerPaiementFacture(
  factureId: string,
  data: { methode: string; reference?: string | null; note?: string | null },
  now = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    const facture = await tx.facture.findUnique({ where: { id: factureId }, include: { abonnement: true } })
    if (!facture || (facture.statut !== 'EN_ATTENTE' && facture.statut !== 'A_VENIR')) return null

    const paiement = await tx.paiement.create({
      data: {
        abonnementId: facture.abonnementId,
        montant: facture.montant,
        methode: data.methode,
        reference: data.reference || null,
        note: data.note || null,
        confirmeParAdmin: true,
        dateReglement: now,
      },
    })
    await tx.facture.update({
      where: { id: facture.id },
      data: { statut: 'PAYEE', paiementId: paiement.id, payeeLe: now, emiseLe: facture.emiseLe ?? now },
    })

    const debloque = await debloquerSiAJour(tx, facture.abonnement, now)
    return { facture, debloque }
  })
}

/** Débloque un vendeur bloqué qui n'a plus aucune facture en retard. */
async function debloquerSiAJour(
  tx: Prisma.TransactionClient,
  abo: Pick<Abonnement, 'id' | 'statut' | 'vendeurId' | 'niveau'>,
  now: Date,
): Promise<boolean> {
  if (abo.statut !== 'BLOQUE') return false
  const enRetard = await tx.facture.count({
    where: { abonnementId: abo.id, statut: 'EN_ATTENTE', echeance: { lte: now } },
  })
  if (enRetard > 0) return false
  await tx.abonnement.update({ where: { id: abo.id }, data: { statut: 'ACTIF' } })
  await tx.vendeurProfile.update({
    where: { id: abo.vendeurId },
    data: { prioriteAffichage: prioriteDuNiveau(abo.niveau) },
  })
  return true
}

export type EffetRetour =
  | { type: 'aucun' }                                        // produit admin, forfait, commande non livrée…
  | { type: 'cycle_en_cours' }                               // pas encore facturé : l'estimation baisse d'elle-même
  | { type: 'facture_reduite'; numero: string; avant: number; apres: number; debloque: boolean }
  | { type: 'avoir'; numero: string; montant: number }       // facture déjà payée : crédit sur la prochaine

/**
 * Corrige la commission du vendeur après un retour accepté (une seule fois par retour) :
 * facture à régler → recalculée ; facture déjà payée → avoir sur la prochaine facture.
 * Appelé par l'admin (page Retours), le webhook Flowmerce et la soumission d'un retour.
 */
export async function ajusterCommissionApresRetour(
  tx: Prisma.TransactionClient,
  returnRequestId: string,
  now = new Date(),
): Promise<EffetRetour> {
  const rr = await tx.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: {
      order: {
        select: {
          livreeLe: true,
          items: { select: { productId: true, prix: true, quantite: true, product: { select: { vendeurId: true } } } },
        },
      },
    },
  })
  if (!rr || rr.status !== 'APPROVED' || rr.commissionAjustee) return { type: 'aucun' }
  // Réservation atomique : si l'admin et le webhook arrivent en même temps, un seul corrige.
  const { count } = await tx.returnRequest.updateMany({
    where: { id: rr.id, status: 'APPROVED', commissionAjustee: false },
    data: { commissionAjustee: true },
  })
  if (count === 0) return { type: 'aucun' }

  const vendeurId = rr.order.items.find(i => i.product.vendeurId)?.product.vendeurId
  const livreeLe = rr.order.livreeLe
  if (!vendeurId || !livreeLe) return { type: 'aucun' }
  const abo = await tx.abonnement.findUnique({ where: { vendeurId } })
  if (!abo) return { type: 'aucun' }

  const facture = await tx.facture.findFirst({
    where: {
      abonnementId: abo.id,
      type: 'COMMISSION',
      statut: { in: ['EN_ATTENTE', 'PAYEE'] },
      periodeDebut: { lte: livreeLe },
      periodeFin: { gt: livreeLe },
    },
  })
  if (!facture) {
    return abo.mode === 'COMMISSION' && livreeLe >= abo.dateDebut ? { type: 'cycle_en_cours' } : { type: 'aucun' }
  }

  const numero = numeroFacture(facture.id, facture.emiseLe ?? facture.createdAt)
  if (facture.statut === 'EN_ATTENTE') {
    const { ventesBrutes, nbCommandes } = await ventesLivrees(tx, vendeurId, facture.periodeDebut, facture.periodeFin)
    const apres = Math.max(0, arrondi(ventesBrutes * (facture.taux ?? 0) - facture.avoirDeduit))
    await tx.facture.update({
      where: { id: facture.id },
      data: { ventesBrutes, nbCommandes, montant: apres, statut: apres > 0 ? 'EN_ATTENTE' : 'ANNULEE' },
    })
    const debloque = await debloquerSiAJour(tx, abo, now)
    return { type: 'facture_reduite', numero, avant: facture.montant, apres, debloque }
  }

  // Facture déjà payée : la part de commission de l'article retourné devient un avoir.
  const retourne = rr.order.items
    .filter(i => !rr.productId || i.productId === rr.productId)
    .reduce((s, i) => s + i.prix * i.quantite, 0)
  const montant = arrondi(retourne * (facture.taux ?? 0))
  if (montant <= 0) return { type: 'aucun' }
  await tx.abonnement.update({ where: { id: abo.id }, data: { avoir: { increment: montant } } })
  return { type: 'avoir', numero, montant }
}

/** Retire l'avoir disponible d'un montant à facturer. */
export function deduireAvoir(montant: number, avoir: number) {
  const deduit = arrondi(Math.min(Math.max(avoir, 0), montant))
  return { montant: arrondi(montant - deduit), deduit }
}

/** Priorité d'affichage cohérente avec l'abonnement (99 si bloqué). */
export function prioriteAbonnement(abo: Pick<Abonnement, 'statut' | 'niveau'>): number {
  return abo.statut === 'BLOQUE' ? PRIORITE_BLOQUE : prioriteDuNiveau(abo.niveau)
}

/** Liste admin : un vendeur par ligne, avec ce qu'il doit et sa prochaine échéance. */
export async function listeAbonnementsAdmin(now = new Date()) {
  const abonnements = await prisma.abonnement.findMany({
    where: { niveau: { not: 'NIVEAU_0' } },
    include: {
      vendeur: { select: { nomBoutique: true, user: { select: { nom: true, prenom: true } } } },
      factures: { where: { statut: { in: ['EN_ATTENTE', 'A_VENIR'] } }, select: { statut: true, montant: true, echeance: true } },
    },
  })

  return abonnements.map(a => {
    const dues = a.factures.filter(f => f.statut === 'EN_ATTENTE')
    const echeance = dues.map(f => f.echeance).filter((d): d is Date => !!d).sort((x, y) => x.getTime() - y.getTime())[0] ?? null
    return {
      id: a.id,
      vendeurId: a.vendeurId,
      nomBoutique: a.vendeur.nomBoutique,
      nom: `${a.vendeur.user.prenom} ${a.vendeur.user.nom}`.trim(),
      mode: a.mode,
      niveau: a.niveau,
      statut: a.statut,
      periodicite: a.periodicite,
      cycleFin: a.dateFin.toISOString(),
      forfaitFin: a.forfaitFin?.toISOString() ?? null,
      aPayer: arrondi(dues.reduce((s, f) => s + f.montant, 0)),
      forfaitAVenir: a.factures.some(f => f.statut === 'A_VENIR'),
      echeance: echeance?.toISOString() ?? null,
      joursRestants: echeance ? joursAvant(echeance, now) : null,
    }
  }).sort((x, y) =>
    // Bloqués d'abord, puis l'échéance la plus proche, puis le reste par boutique.
    Number(y.statut === 'BLOQUE') - Number(x.statut === 'BLOQUE') ||
    (x.echeance ?? '9').localeCompare(y.echeance ?? '9') ||
    (x.nomBoutique ?? x.nom).localeCompare(y.nomBoutique ?? y.nom),
  )
}

export type LigneAbonnementAdmin = Awaited<ReturnType<typeof listeAbonnementsAdmin>>[number]
