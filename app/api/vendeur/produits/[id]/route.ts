import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function getVendeur() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') return null
  const v = await prisma.vendeurProfile.findUnique({ where: { userId: session.user.id } })
  return v?.statut === 'APPROUVE' ? v : null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const vendeur = await getVendeur()
  if (!vendeur) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const { id } = await params
  const produit = await prisma.product.findFirst({
    where: { id, vendeurId: vendeur.id },
    include: {
      category: true,
      variants: { include: { options: { orderBy: { createdAt: 'asc' } } } },
      _count: { select: { orderItems: true, favorites: true } },
    },
  })
  if (!produit) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  return NextResponse.json(produit)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const vendeur = await getVendeur()
  if (!vendeur) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const { id } = await params
  const produit = await prisma.product.findFirst({ where: { id, vendeurId: vendeur.id } })
  if (!produit) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  const { nom, description, prix, stock, images, categoryId, actif, prixVariables, typeOption, variants } = await req.json()

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(nom         !== undefined && { nom: nom.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(prix        !== undefined && { prix: parseFloat(prix) }),
      ...(stock       !== undefined && { stock: parseInt(stock) }),
      ...(images      !== undefined && { images }),
      ...(categoryId  !== undefined && { categoryId }),
      ...(actif       !== undefined && { actif }),
      ...(typeOption  !== undefined && { typeOption: typeOption || null }),
      ...(prixVariables !== undefined && { prixVariables: prixVariables?.length > 0 ? prixVariables : null }),
    },
    include: { category: { select: { id: true, nom: true } } },
  })

  if (variants !== undefined) {
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
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const vendeur = await getVendeur()
  if (!vendeur) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const { id } = await params
  const produit = await prisma.product.findFirst({
    where: { id, vendeurId: vendeur.id },
    include: { _count: { select: { orderItems: true } } },
  })
  if (!produit) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  if (produit._count.orderItems > 0) {
    await prisma.product.update({ where: { id }, data: { actif: false } })
    return NextResponse.json({ message: 'Produit désactivé (commandes existantes)' })
  }
  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ message: 'Produit supprimé' })
}
