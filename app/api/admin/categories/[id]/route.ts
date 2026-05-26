import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

// PATCH — Approuver ou refuser une catégorie proposée par un vendeur
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })

    const { action } = body
    if (!['approuver', 'refuser'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const cat = await prisma.category.findUnique({ where: { id } })
    if (!cat) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })

    const statut = action === 'approuver' ? 'APPROUVEE' : 'REFUSEE'

    const updated = await prisma.category.update({
      where: { id },
      data: { statut },
    })

    return NextResponse.json({
      ...updated,
      message: `Catégorie ${action === 'approuver' ? 'approuvée' : 'refusée'} avec succès`,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT — Modifier une catégorie
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params
    const { nom, description, image } = await req.json()

    if (!nom) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const category = await prisma.category.update({
      where: { id },
      data: { nom, description: description || null, image: image || null },
    })

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — Supprimer une catégorie
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params

    // Vérifier si la catégorie a des produits
    const count = await prisma.product.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ${count} produit(s) dans cette catégorie` },
        { status: 400 }
      )
    }

    await prisma.category.delete({ where: { id } })

    return NextResponse.json({ message: 'Catégorie supprimée' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}