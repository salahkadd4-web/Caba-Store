import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getPrixUnitaire } from '@/lib/prix'
import { FRAIS_EXPEDITION, METHODE_EXPEDITION_DEFAUT } from '@/lib/constants'

// GET — Récupérer les commandes de l'utilisateur
export async function GET() {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const commandes = await prisma.order.findMany({
      where: { userId: token.id as string },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { include: { category: { select: { nom: true } } } },
          },
        },
      },
    })

    return NextResponse.json(commandes)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — Créer une commande par groupe de vendeur
//
// Body attendu :
// {
//   adresse: string,
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
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { adresse, modePaiement } = body

    // Support ancien format (methodeExpedition global) + nouveau format (vendeurGroupes)
    const vendeurGroupes: Array<{ vendeurId: string | null; methodeExpedition: string }> =
      Array.isArray(body.vendeurGroupes)
        ? body.vendeurGroupes
        : [{ vendeurId: null, methodeExpedition: body.methodeExpedition ?? METHODE_EXPEDITION_DEFAUT }]

    if (!adresse) {
      return NextResponse.json({ error: 'Adresse de livraison requise' }, { status: 400 })
    }

    // Récupérer le panier avec toutes les relations nécessaires
    const panier = await prisma.cart.findUnique({
      where: { userId: token.id as string },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendeur: { select: { id: true } },
              },
            },
            variant:       true,
            variantOption: true,
          },
        },
      },
    })

    if (!panier || panier.items.length === 0) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 })
    }

    // ── Grouper les items du panier par vendeurId ──────────────────────────
    // Clé : vendeurId (string) ou '__admin__' pour les produits sans vendeur
    const ADMIN_KEY = '__admin__'
    const itemsParVendeur = new Map<string, typeof panier.items>()

    for (const item of panier.items) {
      const key = item.product.vendeur?.id ?? ADMIN_KEY
      if (!itemsParVendeur.has(key)) itemsParVendeur.set(key, [])
      itemsParVendeur.get(key)!.push(item)
    }

    // ── Vérifier que chaque groupe commandé existe dans le panier ──────────
    // (tolérance : si un vendeur du panier n'a pas de groupe dans le body
    //  en mode legacy, on lui assigne la méthode par défaut)
    const groupesEffectifs: Array<{ vendeurId: string | null; methodeExpedition: string; items: typeof panier.items }> = []

    for (const [key, items] of itemsParVendeur) {
      const vendeurId = key === ADMIN_KEY ? null : key

      // Trouver la méthode d'expédition voulue pour ce vendeur
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

    // ── Transaction atomique ───────────────────────────────────────────────
    // Pour chaque groupe on :
    //   1. Décrémente les stocks (atomique, protection contre la survente)
    //   2. Crée la commande avec les items du groupe
    // Le vidage du panier se fait en fin de transaction.
    try {
      const commandeIds = await prisma.$transaction(async (tx) => {
        // Calcul de la quantité totale par produit (pour prix dégressifs)
        const qteParProduit = new Map<string, number>()
        for (const item of panier.items) {
          qteParProduit.set(item.productId, (qteParProduit.get(item.productId) ?? 0) + item.quantite)
        }

        // 1. Décrémenter les stocks (une seule passe pour tous les groupes)
        for (const item of panier.items) {
          if (item.variantOptionId) {
            const r = await tx.variantOption.updateMany({
              where: { id: item.variantOptionId, stock: { gte: item.quantite } },
              data:  { stock: { decrement: item.quantite } },
            })
            if (r.count === 0) {
              throw new Error(`Stock insuffisant pour ${item.product.nom}${item.variantOption ? ` (${item.variantOption.valeur})` : ''}`)
            }
          } else if (item.variantId) {
            const r = await tx.productVariant.updateMany({
              where: { id: item.variantId, stock: { gte: item.quantite } },
              data:  { stock: { decrement: item.quantite } },
            })
            if (r.count === 0) {
              throw new Error(`Stock insuffisant pour ${item.product.nom}${item.variant ? ` (${item.variant.nom})` : ''}`)
            }
          } else {
            const r = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantite } },
              data:  { stock: { decrement: item.quantite } },
            })
            if (r.count === 0) {
              throw new Error(`Stock insuffisant pour ${item.product.nom}`)
            }
            // Désactiver si stock = 0
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
              total,
              modePaiement:      modePaiement || 'Paiement à la livraison',
              methodeExpedition: groupe.methodeExpedition,
              fraisLivraison:    frais,
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
        { message: 'Commande(s) créée(s) avec succès', commandeIds },
        { status: 201 },
      )
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur serveur'
      if (message.startsWith('Stock insuffisant')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      throw e
    }
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}