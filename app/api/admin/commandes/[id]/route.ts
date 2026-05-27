import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

// PATCH /api/admin/commandes/[id]
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
            .map((item: { product: { vendeurId: string | null } }) => item.product.vendeurId)
            .filter((v: string | null): v is string => v !== null)
        ),
      ]
      const aDesProduitsAdmin = commande.items.some(
        (item: { product: { vendeurId: string | null } }) => item.product.vendeurId === null
      )

      const approbations: Record<string, boolean> =
        (commande.approbationsVendeurs as Record<string, boolean>) ?? {}
      if (aDesProduitsAdmin) approbations['admin'] = true

      const tousVendeursOk = (vendeurIds as string[]).every((vid: string) => approbations[vid] === true)
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
    })

    return NextResponse.json(commande)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}