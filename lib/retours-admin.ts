/**
 * lib/retours-admin.ts
 * --------------------
 * Réclamations de retour vues par l'admin (page /retours) : commande, client,
 * vendeur, produit retourné, réponses du formulaire, statut.
 */

import 'server-only'
import { prisma } from '@/lib/prisma'

/** Réponses du formulaire lisibles (texte, nombre, liste de textes) ; fichiers et objets ignorés. */
function reponsesLisibles(reponses: unknown): { cle: string; valeur: string }[] {
  if (!reponses || typeof reponses !== 'object' || Array.isArray(reponses)) return []
  return Object.entries(reponses as Record<string, unknown>).flatMap(([cle, v]) => {
    const valeur =
      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v)
      : Array.isArray(v) && v.every(x => typeof x === 'string') ? v.join(', ')
      : null
    if (!valeur || /^https?:\/\//.test(valeur) || valeur.length > 500) return []
    return [{ cle: cle.replace(/[_-]+/g, ' '), valeur }]
  })
}

export async function listeRetoursAdmin() {
  const retours = await prisma.returnRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      order: {
        select: {
          id: true, total: true, createdAt: true, livreeLe: true,
          user: { select: { nom: true, prenom: true, email: true, telephone: true } },
          items: {
            select: {
              productId: true, prix: true, quantite: true, variantNom: true, variantOptionValeur: true,
              product: { select: { nom: true, images: true, vendeur: { select: { id: true, nomBoutique: true } } } },
            },
          },
        },
      },
    },
  })

  return retours.map(r => {
    const items = r.order.items.filter(i => !r.productId || i.productId === r.productId)
    const vendeur = r.order.items.find(i => i.product.vendeur)?.product.vendeur ?? null
    return {
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      decideLe: r.decideLe?.toISOString() ?? null,
      flowmerceClaimId: r.flowmerceClaimId,
      commissionAjustee: r.commissionAjustee,
      commandeEntiere: !r.productId,
      orderId: r.order.id,
      livreeLe: r.order.livreeLe?.toISOString() ?? null,
      client: {
        nom: `${r.order.user.prenom} ${r.order.user.nom}`.trim(),
        contact: r.order.user.telephone ?? r.order.user.email ?? '',
      },
      vendeur: vendeur ? { id: vendeur.id, nom: vendeur.nomBoutique } : null,
      articles: items.map(i => ({
        nom: i.product.nom,
        image: i.product.images[0] ?? null,
        variante: [i.variantNom, i.variantOptionValeur].filter(Boolean).join(' · ') || null,
        prix: i.prix,
        quantite: i.quantite,
      })),
      montant: items.reduce((s, i) => s + i.prix * i.quantite, 0),
      reponses: reponsesLisibles(r.reponses),
    }
  })
}

export type RetourAdmin = Awaited<ReturnType<typeof listeRetoursAdmin>>[number]
