import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getI18n } from '@/lib/i18n/server'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

// PATCH — Approuver ou refuser une catégorie proposée par un vendeur
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { t } = await getI18n()
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: t.msg.invalidBody }, { status: 400 })

    const { action } = body
    if (!['approuver', 'refuser'].includes(action)) {
      return NextResponse.json({ error: t.msg.invalidAction }, { status: 400 })
    }

    const cat = await prisma.category.findUnique({ where: { id } })
    if (!cat) return NextResponse.json({ error: t.msg.categoryNotFound }, { status: 404 })

    const statut = action === 'approuver' ? 'APPROUVEE' : 'REFUSEE'

    const updated = await prisma.category.update({
      where: { id },
      data: { statut },
    })

    return NextResponse.json({
      ...updated,
      message: action === 'approuver' ? t.msg.categoryApproved : t.msg.categoryRefused,
    })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}

// PUT — Modifier une catégorie
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { t } = await getI18n()
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const { id } = await params
    const { nom, description, image } = await req.json()

    if (!nom) return NextResponse.json({ error: t.msg.nameRequired }, { status: 400 })

    const category = await prisma.category.update({
      where: { id },
      data: { nom, description: description || null, image: image || null },
    })

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}

// DELETE — Supprimer une catégorie
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { t } = await getI18n()
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const { id } = await params

    // Vérifier si la catégorie a des produits
    const count = await prisma.product.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json(
        { error: t.msg.categoryHasProducts(count) },
        { status: 400 }
      )
    }

    await prisma.category.delete({ where: { id } })

    return NextResponse.json({ message: t.msg.categoryDeleted })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}