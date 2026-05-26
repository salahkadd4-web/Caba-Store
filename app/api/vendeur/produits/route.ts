import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

type VariantInput = {
  nom: string
  couleur?: string | null
  stock: number | string
  images?: string[]
  options?: { valeur: string; stock: number | string }[]
}

async function getVendeur() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') return null
  const v = await prisma.vendeurProfile.findUnique({ where: { userId: session.user.id } })
  return v?.statut === 'APPROUVE' ? v : null
}

export async function GET(req: NextRequest) {
  const vendeur = await getVendeur()
  if (!vendeur) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const actif = searchParams.get('actif')
  const where: Prisma.ProductWhereInput = { vendeurId: vendeur.id }
  if (actif === 'true')  where.actif = true
  if (actif === 'false') where.actif = false

  const produits = await prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, nom: true } },
      variants: {
        orderBy: { createdAt: 'asc' },
        include: { options: { orderBy: { createdAt: 'asc' } } },
      },
      _count: { select: { orderItems: true, favorites: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(produits)
}

export async function POST(req: NextRequest) {
  const vendeur = await getVendeur()
  if (!vendeur) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { nom, description, prix, stock, images, categoryId, actif, prixVariables, typeOption, variants } = await req.json()
  if (!nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  if (!prix || isNaN(prix)) return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
  if (!categoryId) return NextResponse.json({ error: 'Catégorie requise' }, { status: 400 })

  const cat = await prisma.category.findFirst({ where: { id: categoryId, statut: 'APPROUVEE' } })
  if (!cat) return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })

  const produit = await prisma.product.create({
    data: {
      nom: nom.trim(), description: description?.trim() || null,
      prix: parseFloat(prix), stock: parseInt(stock) || 0,
      images: images || [], categoryId, vendeurId: vendeur.id,
      actif: actif !== false,
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
    include: {
      category: { select: { id: true, nom: true } },
      variants: { include: { options: true } },
    },
  })
  return NextResponse.json(produit, { status: 201 })
}
