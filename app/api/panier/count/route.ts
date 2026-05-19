import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'

export async function GET() {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ count: 0 })

    const result = await prisma.cartItem.aggregate({
      where: { cart: { userId: token.id as string } },
      _sum: { quantite: true },
    })

    return NextResponse.json({ count: result._sum.quantite ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}