import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { registerProductReference } from '@/lib/scanApi'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

// PATCH /api/admin/commandes/[id]
// L'admin peut :
//   1. Changer directement le statut global (comportement inchangé)
//   2. Envoyer { approuver: true } pour approuver sa part (produits sans vendeur)
//      → si tous les vendeurs ont aussi approuvé, passe à CONFIRMEE automatiquement
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { statut, approuver } = body

    // ── Cas 1 : l'admin approuve juste sa part ──────────────────────────
    if (approuver === true) {
      const commande = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: { select: { vendeurId: true } },
            },
          },
        },
      })

      if (!commande) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
      if (commande.statut !== 'EN_ATTENTE') {
        return NextResponse.json({ error: 'La commande est déjà traitée.' }, { status: 403 })
      }

      const vendeurIds = [
        ...new Set(
          commande.items
            .map(item => item.product.vendeurId)
            .filter((v): v is string => v !== null)
        ),
      ]
      const aDesProduitsAdmin = commande.items.some(item => item.product.vendeurId === null)

      const approbations = ((commande.approbationsVendeurs as Record<string, boolean>) ?? {})
      if (aDesProduitsAdmin) approbations['admin'] = true

      const tousVendeursOk = vendeurIds.every(vid => approbations[vid] === true)
      const adminOk = aDesProduitsAdmin ? approbations['admin'] === true : true
      const tousOk = tousVendeursOk && adminOk

      const updated = await prisma.order.update({
        where: { id },
        data: {
          approbationsVendeurs: approbations,
          ...(tousOk ? { statut: 'CONFIRMEE' } : {}),
        },
      })

      return NextResponse.json({
        ...updated,
        message: tousOk
          ? 'Commande confirmée — tous les vendeurs ont approuvé.'
          : 'Approbation enregistrée — en attente des autres vendeurs.',
      })
    }

    // ── Cas 2 : l'admin change directement le statut global ─────────────
    const validStatuts = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'ANNULEE']
    if (!statut || !validStatuts.includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const commande = await prisma.order.update({
      where: { id },
      data:  { statut },
      include: {
        items: {
          include: { product: { select: { id: true, images: true, nom: true } } },
          take: 1,
        },
      },
    })

    // Enregistrer la photo de référence ML quand l'admin passe à CONFIRMEE
    if (statut === 'CONFIRMEE') {
      const item = commande.items[0]
      if (item?.product?.images?.[0]) {
        setImmediate(async () => {
          try {
            const imageUrl = item.product.images[0]
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 15000)
            const imgRes = await fetch(imageUrl, { signal: controller.signal })
            clearTimeout(timeout)
            if (imgRes.ok) {
              const buffer   = await imgRes.arrayBuffer()
              const base64   = Buffer.from(buffer).toString('base64')
              const mime     = imgRes.headers.get('content-type') || 'image/jpeg'
              const imageB64 = `data:${mime};base64,${base64}`
              const refResult = await registerProductReference(id, item.product.id, imageB64)
              if (refResult) console.log(`✅ Référence enregistrée — commande ${id.slice(-6)} — ${item.product.nom}`)
            }
          } catch (refError) {
            const err = refError as { cause?: { code?: string }; message?: string }
            if (err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
              console.warn(`⚠️ Timeout Cloudinary — référence non enregistrée pour commande ${id.slice(-6)}`)
            } else {
              console.warn('Référence ML non enregistrée:', err?.message || refError)
            }
          }
        })
      }
    }

    return NextResponse.json(commande)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}