import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getPrixUnitaire } from '@/lib/prix'
import {
  ADRESSE_MAX, FRAIS_EXPEDITION, METHODE_EXPEDITION_DEFAUT, MODE_PAIEMENT_DEFAUT, MODES_PAIEMENT_ACTIFS,
} from '@/lib/constants'
import { isProduitVisible } from '@/lib/product-visibility'
import { randomUUID } from 'crypto'
import { getI18n } from '@/lib/i18n/server'
import { validateWilayaCommune } from '@/lib/algeria/server'

/** Rupture de stock détectée pendant la transaction (nom du produit/variante inclus). */
class StockInsuffisantError extends Error {
  constructor(public readonly produit: string) {
    super('STOCK_INSUFFISANT')
  }
}

// GET — Récupérer les commandes de l'utilisateur (groupées par groupeId côté client)
export async function GET() {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const commandes = await prisma.order.findMany({
      where: { userId: token.id as string },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: { select: { nom: true } },
                vendeur:  { select: { id: true, nomBoutique: true } },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(commandes)
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}

// POST — Créer une commande par groupe de vendeur
//
// Body attendu :
// {
//   adresse: string,
//   wilaya: string,               // code de wilaya ("16")
//   commune: string,
//   modePaiement: string,
//   vendeurGroupes: Array<{
//     vendeurId: string | null,   // null = produits admin
//     methodeExpedition: string
//   }>
// }
//
// Compatibilité descendante : si vendeurGroupes est absent, on tombe sur
// l'ancien comportement (une seule commande, methodeExpedition global).
export async function POST(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const body = await req.json()
    const adresse      = typeof body.adresse === 'string' ? body.adresse.trim() : ''
    const modePaiement = body.modePaiement ?? MODE_PAIEMENT_DEFAUT

    // Support ancien format (methodeExpedition global) + nouveau format (vendeurGroupes)
    const vendeurGroupes: Array<{ vendeurId: string | null; methodeExpedition: string }> =
      Array.isArray(body.vendeurGroupes)
        ? body.vendeurGroupes
        : [{ vendeurId: null, methodeExpedition: body.methodeExpedition ?? METHODE_EXPEDITION_DEFAUT }]

    if (!adresse || adresse.length > ADRESSE_MAX) {
      return NextResponse.json({ error: t.orders.api.addressRequired }, { status: 400 })
    }
    if (!MODES_PAIEMENT_ACTIFS.includes(modePaiement)) {
      return NextResponse.json({ error: t.orders.api.paymentUnavailable }, { status: 400 })
    }

    // Wilaya + commune de livraison obligatoires et cohérentes (fichiers JSON)
    const lieu = validateWilayaCommune(body.wilaya, body.commune)
    if (!lieu.ok) {
      return NextResponse.json(
        { error: lieu.field === 'wilaya' ? t.address.invalidWilaya : t.address.invalidCommune },
        { status: 400 },
      )
    }
    if (!lieu.wilaya || !lieu.commune) {
      return NextResponse.json({ error: t.orders.api.wilayaCommuneRequired }, { status: 400 })
    }

    // Récupérer le panier avec toutes les relations nécessaires
    const panier = await prisma.cart.findUnique({
      where: { userId: token.id as string },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendeur: { select: { id: true, statut: true, prioriteAffichage: true } },
              },
            },
            variant:       true,
            variantOption: true,
          },
        },
      },
    })

    if (!panier || panier.items.length === 0) {
      return NextResponse.json({ error: t.orders.api.emptyCart }, { status: 400 })
    }

    // Un produit masqué depuis son ajout au panier (désactivé, vendeur suspendu,
    // abonnement expiré) ne peut plus être commandé.
    const indisponible = panier.items.find(i => !isProduitVisible(i.product) || i.quantite < 1)
    if (indisponible) {
      return NextResponse.json(
        { error: t.orders.api.productUnavailable(indisponible.product.nom) },
        { status: 400 },
      )
    }

    // ── Grouper les items du panier par vendeurId ──────────────────────────
    const ADMIN_KEY = '__admin__'
    const itemsParVendeur = new Map<string, typeof panier.items>()

    for (const item of panier.items) {
      const key = item.product.vendeur?.id ?? ADMIN_KEY
      if (!itemsParVendeur.has(key)) itemsParVendeur.set(key, [])
      itemsParVendeur.get(key)!.push(item)
    }

    const groupesEffectifs: Array<{ vendeurId: string | null; methodeExpedition: string; items: typeof panier.items }> = []

    for (const [key, items] of itemsParVendeur) {
      const vendeurId = key === ADMIN_KEY ? null : key
      const groupe = vendeurGroupes.find(g =>
        (g.vendeurId === null && key === ADMIN_KEY) ||
        g.vendeurId === vendeurId
      )
      const methode =
        typeof groupe?.methodeExpedition === 'string' && groupe.methodeExpedition in FRAIS_EXPEDITION
          ? groupe.methodeExpedition
          : METHODE_EXPEDITION_DEFAUT

      groupesEffectifs.push({ vendeurId, methodeExpedition: methode, items })
    }

    // Identifiant partagé pour toutes les commandes de ce panier.
    // Permet au bureau de livraison de regrouper les colis multi-vendeurs.
    const groupeId = groupesEffectifs.length > 1 ? randomUUID() : null

    // ── Transaction atomique ───────────────────────────────────────────────
    try {
      const commandeIds = await prisma.$transaction(async (tx) => {
        // Calcul de la quantité totale par produit (pour prix dégressifs)
        const qteParProduit = new Map<string, number>()
        for (const item of panier.items) {
          qteParProduit.set(item.productId, (qteParProduit.get(item.productId) ?? 0) + item.quantite)
        }

        // 1. Décrémenter les stocks
        for (const item of panier.items) {
          if (item.variantOptionId) {
            const r = await tx.variantOption.updateMany({
              where: { id: item.variantOptionId, stock: { gte: item.quantite } },
              data:  { stock: { decrement: item.quantite } },
            })
            if (r.count === 0) {
              throw new StockInsuffisantError(`${item.product.nom}${item.variantOption ? ` (${item.variantOption.valeur})` : ''}`)
            }
          } else if (item.variantId) {
            const r = await tx.productVariant.updateMany({
              where: { id: item.variantId, stock: { gte: item.quantite } },
              data:  { stock: { decrement: item.quantite } },
            })
            if (r.count === 0) {
              throw new StockInsuffisantError(`${item.product.nom}${item.variant ? ` (${item.variant.nom})` : ''}`)
            }
          } else {
            const r = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantite } },
              data:  { stock: { decrement: item.quantite } },
            })
            if (r.count === 0) {
              throw new StockInsuffisantError(item.product.nom)
            }
            await tx.product.updateMany({
              where: { id: item.productId, stock: 0 },
              data:  { actif: false },
            })
          }
        }

        // 2. Créer une commande par groupe de vendeur
        const ids: string[] = []
        for (const groupe of groupesEffectifs) {
          const frais     = FRAIS_EXPEDITION[groupe.methodeExpedition]
          const sousTotal = groupe.items.reduce(
            (acc, item) =>
              acc + getPrixUnitaire(item.product.prixVariables, qteParProduit.get(item.productId)!, item.product.prix) * item.quantite,
            0,
          )
          const total = sousTotal + frais

          const commande = await tx.order.create({
            data: {
              userId:            token.id as string,
              adresse,
              wilaya:            lieu.wilaya,
              commune:           lieu.commune,
              total,
              modePaiement,
              methodeExpedition: groupe.methodeExpedition,
              fraisLivraison:    frais,
              groupeId,            // ← lien entre toutes les commandes de ce panier
              items: {
                create: groupe.items.map(item => ({
                  productId:           item.productId,
                  quantite:            item.quantite,
                  prix:                getPrixUnitaire(item.product.prixVariables, qteParProduit.get(item.productId)!, item.product.prix),
                  variantId:           item.variantId          ?? null,
                  variantNom:          item.variant?.nom        ?? null,
                  variantOptionId:     item.variantOptionId    ?? null,
                  variantOptionValeur: item.variantOption?.valeur ?? null,
                })),
              },
            },
          })
          ids.push(commande.id)
        }

        // 3. Vider le panier
        await tx.cartItem.deleteMany({ where: { cartId: panier.id } })

        return ids
      })

      return NextResponse.json(
        { message: t.orders.api.created, commandeIds },
        { status: 201 },
      )
    } catch (e: unknown) {
      if (e instanceof StockInsuffisantError) {
        return NextResponse.json({ error: t.orders.api.insufficientStock(e.produit) }, { status: 400 })
      }
      throw e
    }
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
