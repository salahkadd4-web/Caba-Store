import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getI18n } from '@/lib/i18n/server'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

export async function GET() {
  const { t } = await getI18n()
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const categories = await prisma.category.findMany({
      orderBy: { nom: 'asc' },
      include: { _count: { select: { products: true } } },
    })

    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const { nom, description, image } = await req.json()

    if (!nom) return NextResponse.json({ error: t.msg.nameRequired }, { status: 400 })

    const category = await prisma.category.create({
      data: { nom, description: description || null, image: image || null },
    })

    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
