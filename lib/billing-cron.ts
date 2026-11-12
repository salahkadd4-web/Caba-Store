/**
 * lib/billing-cron.ts
 * -------------------
 * Traitement quotidien de la facturation vendeurs (route /api/cron/abonnements) :
 *   1. clôture des cycles échus : facture de commission (échéance = fin du cycle
 *      suivant), application de l'offre choisie, renouvellement des forfaits ;
 *   2. forfait exigible dès la première commande livrée de sa période ;
 *   3. rappels « il vous reste xx jours » à J+7, 15, 21, 25, 27 et 29 ;
 *   4. échéance dépassée sans paiement → vendeur bloqué (produits masqués).
 * Idempotent : on peut le relancer le même jour sans double facture ni double rappel.
 */

import 'server-only'
import { prisma } from '@/lib/prisma'
import type { NiveauAbonnement } from '@/generated/prisma/client'
import {
  DUREES_FORFAIT, PRIORITE_BLOQUE, RAPPELS_JOURS,
  addMonths, arrondi, isDureeForfait, joursAvant, joursDepuis,
  prioriteDuNiveau, prixForfait, tauxCommission,
} from '@/lib/billing-offers'
import { deduireAvoir, ventesLivrees } from '@/lib/seller-billing'
import { sendCompteBloque, sendRappelPaiement } from '@/lib/mail'

/** Clôt un cycle échu. Renvoie false s'il n'y avait rien à clore. */
async function cloturerUnCycle(abonnementId: string, now: Date): Promise<{ commission: boolean } | null> {
  return prisma.$transaction(async (tx) => {
    const abo = await tx.abonnement.findUnique({ where: { id: abonnementId } })
    if (!abo || abo.niveau === 'NIVEAU_0' || abo.dateFin > now) return null

    const debut = abo.dateDebut
    const fin = abo.dateFin
    let commission = false

    // 1. Commission du cycle écoulé
    if (abo.mode === 'COMMISSION') {
      const { ventesBrutes, nbCommandes } = await ventesLivrees(tx, abo.vendeurId, debut, fin)
      const taux = tauxCommission(abo.niveau)
      // Avoir (retours sur une commission déjà payée) déduit d'abord.
      const { montant, deduit } = deduireAvoir(arrondi(ventesBrutes * taux), abo.avoir)
      if (deduit > 0) await tx.abonnement.update({ where: { id: abo.id }, data: { avoir: { decrement: deduit } } })
      await tx.facture.create({
        data: {
          abonnementId: abo.id,
          type: 'COMMISSION',
          niveau: abo.niveau,
          taux,
          ventesBrutes,
          nbCommandes,
          montant,
          avoirDeduit: deduit,
          periodeDebut: debut,
          periodeFin: fin,
          // Rien vendu (ou couvert par l'avoir) → rien à payer, pas de rappel.
          statut: montant > 0 ? 'EN_ATTENTE' : 'PAYEE',
          emiseLe: fin,
          echeance: addMonths(fin, 1),
        },
      })
      commission = montant > 0
    }

    // 2. Fin de forfait : s'il n'a jamais été exigible (aucune commande livrée), il n'est pas dû.
    const forfaitTermine = abo.mode === 'FORFAIT' && (!abo.forfaitFin || abo.forfaitFin <= fin)
    if (forfaitTermine) {
      await tx.facture.updateMany({
        where: { abonnementId: abo.id, type: 'FORFAIT', statut: 'A_VENIR' },
        data: { statut: 'ANNULEE' },
      })
    }

    // 3. Offre du cycle suivant : celle choisie, sinon la même (le forfait se renouvelle).
    let { mode, periodicite, forfaitFin } = abo
    let niveau: NiveauAbonnement = abo.niveau
    const changement = !!abo.prochainMode && (abo.mode === 'COMMISSION' || forfaitTermine)
    if (changement) {
      mode = abo.prochainMode!
      niveau = abo.prochainNiveau ?? abo.niveau
      periodicite = mode === 'FORFAIT' ? abo.prochainePeriodicite ?? 'mensuel' : null
    }

    const nouveauDebut = fin
    const nouvelleFin = addMonths(fin, 1)

    if (mode === 'FORFAIT' && (abo.mode !== 'FORFAIT' || forfaitTermine)) {
      const duree = isDureeForfait(periodicite) ? periodicite : 'mensuel'
      periodicite = duree
      forfaitFin = addMonths(nouveauDebut, DUREES_FORFAIT[duree].mois)
      await tx.facture.create({
        data: {
          abonnementId: abo.id,
          type: 'FORFAIT',
          niveau,
          periodicite: duree,
          montant: prixForfait(niveau, duree),
          periodeDebut: nouveauDebut,
          periodeFin: forfaitFin,
          statut: 'A_VENIR',
        },
      })
    }
    if (mode === 'COMMISSION') forfaitFin = null

    await tx.abonnement.update({
      where: { id: abo.id },
      data: {
        mode, niveau, periodicite, forfaitFin,
        dateDebut: nouveauDebut,
        dateFin: nouvelleFin,
        ...(changement ? { prochainMode: null, prochainNiveau: null, prochainePeriodicite: null } : {}),
      },
    })
    if (abo.statut === 'ACTIF' && niveau !== abo.niveau) {
      await tx.vendeurProfile.update({
        where: { id: abo.vendeurId },
        data: { prioriteAffichage: prioriteDuNiveau(niveau) },
      })
    }
    return { commission }
  })
}

export async function traiterAbonnements(now = new Date()) {
  const res = {
    cyclesClotures: 0, facturesCommission: 0, forfaitsExigibles: 0,
    rappels: 0, bloques: 0, erreurs: 0,
  }

  // ── 1. Clôture des cycles échus (rattrape plusieurs mois si le cron a manqué des jours) ──
  const echus = await prisma.abonnement.findMany({
    where: { niveau: { not: 'NIVEAU_0' }, dateFin: { lte: now } },
    select: { id: true },
  })
  for (const { id } of echus) {
    try {
      for (let i = 0; i < 24; i++) {
        const r = await cloturerUnCycle(id, now)
        if (!r) break
        res.cyclesClotures++
        if (r.commission) res.facturesCommission++
      }
    } catch (err) {
      console.error(`[billing-cron] clôture ${id}`, err)
      res.erreurs++
    }
  }

  // ── 2. Forfaits devenus exigibles : première commande livrée de la période ──
  const aVenir = await prisma.facture.findMany({
    where: { statut: 'A_VENIR', type: 'FORFAIT', periodeDebut: { lte: now } },
    select: { id: true, periodeDebut: true, periodeFin: true, abonnement: { select: { vendeurId: true } } },
  })
  for (const f of aVenir) {
    const livree = await prisma.order.findFirst({
      where: {
        statut: 'LIVREE',
        livreeLe: { gte: f.periodeDebut, lt: f.periodeFin },
        items: { some: { product: { vendeurId: f.abonnement.vendeurId } } },
      },
      select: { id: true },
    })
    if (!livree) continue
    const exigible = await prisma.$transaction(async (tx) => {
      const facture = await tx.facture.findUnique({ where: { id: f.id }, include: { abonnement: true } })
      if (!facture || facture.statut !== 'A_VENIR') return false
      const { montant, deduit } = deduireAvoir(facture.montant, facture.abonnement.avoir)
      if (deduit > 0) await tx.abonnement.update({ where: { id: facture.abonnementId }, data: { avoir: { decrement: deduit } } })
      await tx.facture.update({
        where: { id: f.id },
        data: montant > 0
          ? { statut: 'EN_ATTENTE', montant, avoirDeduit: deduit, emiseLe: now, echeance: addMonths(now, 1) }
          : { statut: 'PAYEE', montant, avoirDeduit: deduit, emiseLe: now, payeeLe: now },
      })
      return true
    })
    if (exigible) res.forfaitsExigibles++
  }

  // ── 3. Rappels : un seul e-mail par vendeur et par jour, aux jours prévus ──
  const enAttente = await prisma.facture.findMany({
    where: { statut: 'EN_ATTENTE', echeance: { gt: now }, emiseLe: { not: null } },
    select: {
      id: true, montant: true, echeance: true, emiseLe: true, rappelsEnvoyes: true,
      abonnement: {
        select: {
          id: true,
          vendeur: { select: { nomBoutique: true, user: { select: { email: true, prenom: true, nom: true } } } },
        },
      },
    },
  })
  const parAbonnement = new Map<string, typeof enAttente>()
  for (const f of enAttente) {
    const liste = parAbonnement.get(f.abonnement.id) ?? []
    liste.push(f)
    parAbonnement.set(f.abonnement.id, liste)
  }
  for (const factures of parAbonnement.values()) {
    const dus = factures.map(f => ({
      f,
      jours: RAPPELS_JOURS.filter(j => joursDepuis(f.emiseLe!, now) >= j && !f.rappelsEnvoyes.includes(j)),
    })).filter(x => x.jours.length > 0)
    if (dus.length === 0) continue

    const { vendeur } = factures[0].abonnement
    const echeance = factures.map(f => f.echeance!).sort((a, b) => a.getTime() - b.getTime())[0]
    try {
      if (vendeur.user.email) {
        await sendRappelPaiement({
          email: vendeur.user.email,
          prenom: vendeur.user.prenom || vendeur.user.nom,
          nomBoutique: vendeur.nomBoutique || `${vendeur.user.prenom} ${vendeur.user.nom}`,
          montant: arrondi(factures.reduce((s, f) => s + f.montant, 0)),
          echeance,
          joursRestants: joursAvant(echeance, now),
        })
        res.rappels++
      }
      // Même sans e-mail, on marque les jours passés : pas de rafale le jour où l'adresse est ajoutée.
      for (const { f, jours } of dus) {
        await prisma.facture.update({
          where: { id: f.id },
          data: { rappelsEnvoyes: [...f.rappelsEnvoyes, ...jours] },
        })
      }
    } catch (err) {
      console.error('[billing-cron] rappel', err)
      res.erreurs++
    }
  }

  // ── 4. Blocage : échéance dépassée sans paiement ──
  const enRetard = await prisma.abonnement.findMany({
    where: {
      statut: 'ACTIF',
      niveau: { not: 'NIVEAU_0' },
      factures: { some: { statut: 'EN_ATTENTE', echeance: { lte: now } } },
    },
    select: {
      id: true, vendeurId: true,
      factures: { where: { statut: 'EN_ATTENTE' }, select: { montant: true } },
      vendeur: { select: { nomBoutique: true, user: { select: { email: true, prenom: true, nom: true } } } },
    },
  })
  for (const abo of enRetard) {
    try {
      await prisma.$transaction([
        prisma.abonnement.update({ where: { id: abo.id }, data: { statut: 'BLOQUE' } }),
        prisma.vendeurProfile.update({ where: { id: abo.vendeurId }, data: { prioriteAffichage: PRIORITE_BLOQUE } }),
      ])
      res.bloques++
      const { user, nomBoutique } = abo.vendeur
      if (user.email) {
        await sendCompteBloque({
          email: user.email,
          prenom: user.prenom || user.nom,
          nomBoutique: nomBoutique || `${user.prenom} ${user.nom}`,
          montant: arrondi(abo.factures.reduce((s, f) => s + f.montant, 0)),
        }).catch(err => console.error('[billing-cron] mail blocage', err))
      }
    } catch (err) {
      console.error(`[billing-cron] blocage ${abo.id}`, err)
      res.erreurs++
    }
  }

  return res
}
