import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { Prisma } from '@/generated/prisma/client'
import { getI18n } from '@/lib/i18n/server'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

export async function GET(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''

    const where: Prisma.UserWhereInput = { role: 'CLIENT' }
    if (search) {
      where.OR = [
        { nom:       { contains: search, mode: 'insensitive' } },
        { prenom:    { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const clients = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            orders:    true,
            favorites: true,
          },
        },
      },
    })

    // Les retours sont gérés par Flowmerce — aucun champ local lié aux retours
    return NextResponse.json(clients)
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}