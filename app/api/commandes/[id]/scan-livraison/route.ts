import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/getAuthToken'
import { prisma } from '@/lib/prisma'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS:  true,
})

// POST /api/commandes/[id]/scan-livraison
// Confirme simplement la réception de la commande (scan supprimé).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const commande = await prisma.order.findFirst({
      where:   { id, userId: token.id as string, statut: 'EXPEDIEE' },
      include: { user: { select: { nom: true, prenom: true } } },
    })
    if (!commande) {
      return NextResponse.json({ error: 'Commande introuvable ou non expédiée' }, { status: 404 })
    }

    await prisma.order.update({
      where: { id },
      data:  { statut: 'LIVREE' },
    })

    await pusher.trigger('admin-commandes', 'statut-change', {
      commandeId: id,
      statut:     'LIVREE',
      client:     `${commande.user.prenom} ${commande.user.nom}`,
      message:    '📦 Client a confirmé la réception',
      updatedAt:  new Date().toISOString(),
    })

    return NextResponse.json({
      delivery_confirmed: true,
      message:            'Réception confirmée ✅',
    })
  } catch (error) {
    console.error('Erreur confirmation livraison:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}