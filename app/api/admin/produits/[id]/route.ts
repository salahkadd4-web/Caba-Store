import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await params
    const { nom, description, prix, stock, images, categoryId, prixVariables, typeOption, variants } = await req.json()

    await prisma.product.update({
      where: { id },
      data: {
        nom, description: description || null,
        prix: parseFloat(prix), stock: parseInt(stock),
        images: images || [], categoryId,
        actif: parseInt(stock) > 0,
        typeOption: typeOption || null,
        prixVariables: prixVariables?.length > 0 ? prixVariables : null,
      },
    })

    if (variants !== undefined) {
      // Supprimer toutes les variantes existantes (cascade supprime options)
      await prisma.productVariant.deleteMany({ where: { productId: id } })
      if (variants.length > 0) {
        for (const v of variants) {
          await prisma.productVariant.create({
            data: {
              productId: id,
              nom: v.nom, couleur: v.couleur || null,
              stock: parseInt(v.stock) || 0, images: v.images || [],
              options: v.options?.length > 0 ? {
                create: v.options.map((o: { valeur: string; stock: number | string }) => ({
                  valeur: o.valeur, stock: parseInt(String(o.stock)) || 0,
                })),
              } : undefined,
            },
          })
        }
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: { variants: { include: { options: { orderBy: { createdAt: 'asc' } } } } },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await params
    const { actif } = await req.json()
    const produit = await prisma.product.update({ where: { id }, data: { actif } })
    return NextResponse.json(produit)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
