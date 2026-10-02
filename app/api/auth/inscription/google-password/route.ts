import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/getAuthToken'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getI18n } from '@/lib/i18n/server'

const rules = [
  (p: string) => p.length >= 8,
  (p: string) => /[A-Z]/.test(p),
  (p: string) => /[a-z]/.test(p),
  (p: string) => /[0-9]/.test(p),
  (p: string) => /[^A-Za-z0-9]/.test(p),
]

export async function POST(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token?.email) {
      return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })
    }

    const { motDePasse } = await req.json()

    if (!motDePasse || !rules.every(r => r(motDePasse))) {
      return NextResponse.json(
        { error: t.auth.api.passwordConditions },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(motDePasse, 10)

    await prisma.user.update({
      where: { email: token.email },
      data:  { motDePasse: hashed },
    })

    return NextResponse.json({ message: t.auth.api.passwordSaved })
  } catch (error) {
    console.error('Erreur google-password:', error)
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
