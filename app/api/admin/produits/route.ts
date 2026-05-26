import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { Prisma } from '@/generated/prisma/client'

type VariantInput = {
  nom: string
  couleur?: string | null
  stock: number | string
  images?: string[]
  options?: { valeur: string; stock: number | string }[]
}

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

export async function GET(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const vendeurId = searchParams.get('vendeurId')
    const adminOnly = searchParams.get('adminOnly') === 'true'
    const where: Prisma.ProductWhereInput = {}
    if (vendeurId)  where.vendeurId = vendeurId
    if (adminOnly)  where.vendeurId = null
    const produits = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        vendeur: { select: { id: true, nomBoutique: true } },
        variants: {
          orderBy: { createdAt: 'asc' },
          include: { options: { orderBy: { createdAt: 'asc' } } },
        },
      },
    })
    return NextResponse.json(produits)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { nom, description, prix, stock, images, categoryId, prixVariables, typeOption, variants } = await req.json()
    if (!nom || !prix || !categoryId) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    const produit = await prisma.product.create({
      data: {
        nom, description: description || null,
        prix: parseFloat(prix), stock: parseInt(stock) || 0,
        images: images || [],
        categoryId,
        typeOption: typeOption || null,
        prixVariables: prixVariables?.length > 0 ? prixVariables : undefined,
        variants: variants?.length > 0 ? {
          create: (variants as VariantInput[]).map((v) => ({
            nom: v.nom, couleur: v.couleur || null,
            stock: parseInt(String(v.stock)) || 0, images: v.images || [],
            options: v.options && v.options.length > 0 ? {
              create: v.options.map((o) => ({
                valeur: o.valeur, stock: parseInt(String(o.stock)) || 0,
              })),
            } : undefined,
          })),
        } : undefined,
      },
      include: { variants: { include: { options: true } } },
    })
    return NextResponse.json(produit, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
