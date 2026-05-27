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
          include: { product: true },
        },
      },
    })

    return NextResponse.json(commandes)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — Créer une commande
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { adresse, modePaiement, methodeExpedition } = await req.json()

    if (!adresse) {
      return NextResponse.json({ error: 'Adresse de livraison requise' }, { status: 400 })
    }

    // Source de vérité serveur pour les frais d'expédition. Ne JAMAIS faire
    // confiance à un montant envoyé par le client (CWE-602 : trust boundary).
    const methodeChoisie =
      typeof methodeExpedition === 'string' && methodeExpedition in FRAIS_EXPEDITION
        ? methodeExpedition
        : METHODE_EXPEDITION_DEFAUT
    const frais = FRAIS_EXPEDITION[methodeChoisie]

    // Récupérer le panier avec variantes et options
    const panier = await prisma.cart.findUnique({
      where: { userId: token.id as string },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
            variantOption: true,
          },
        },
      },
    })

    if (!panier || panier.items.length === 0) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 })
    }

    // Quantité totale par produit (pour appliquer le bon palier dégressif)
    const qteParProduit = new Map<string, number>()
    for (const item of panier.items) {
      qteParProduit.set(item.productId, (qteParProduit.get(item.productId) ?? 0) + item.quantite)
    }

    // Calculer le total en appliquant les prix dégressifs sur la quantité totale du produit
    const sousTotal = panier.items.reduce(
      (acc, item) => acc + getPrixUnitaire(item.product.prixVariables, qteParProduit.get(item.productId)!, item.product.prix) * item.quantite,
      0
    )
    const total = sousTotal + frais

    // ── Transaction atomique : décrément conditionnel du stock + création
    //    de la commande + vidage du panier. updateMany avec un filtre
    //    `stock: { gte: quantite }` garantit qu'aucune survente ne peut
    //    se produire même en cas de requêtes concurrentes (CWE-362).
    try {
      const commande = await prisma.$transaction(async (tx) => {
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
            // Désactiver le produit si stock = 0 après décrément
            await tx.product.updateMany({
              where: { id: item.productId, stock: 0 },
              data:  { actif: false },
            })
          }
        }

        const created = await tx.order.create({
          data: {
            userId:            token.id as string,
            adresse,
            total,
            modePaiement:      modePaiement      || 'Paiement à la livraison',
            methodeExpedition: methodeChoisie,
            fraisLivraison:    frais,
            items: {
              create: panier.items.map((item) => ({
                productId:          item.productId,
                quantite:           item.quantite,
                prix:               getPrixUnitaire(item.product.prixVariables, qteParProduit.get(item.productId)!, item.product.prix),
                variantId:          item.variantId          ?? null,
                variantNom:         item.variant?.nom        ?? null,
                variantOptionId:    item.variantOptionId    ?? null,
                variantOptionValeur: item.variantOption?.valeur ?? null,
              })),
            },
          },
        })

        await tx.cartItem.deleteMany({ where: { cartId: panier.id } })

        return created
      })

      return NextResponse.json({ message: 'Commande créée avec succès', commandeId: commande.id }, { status: 201 })
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