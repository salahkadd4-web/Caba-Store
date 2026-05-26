import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

export async function GET() {
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const categories = await prisma.category.findMany({
      orderBy: { nom: 'asc' },
      include: { _count: { select: { products: true } } },
    })

    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { nom, description, image } = await req.json()

    if (!nom) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const category = await prisma.category.create({
      data: { nom, description: description || null, image: image || null },
    })

    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
