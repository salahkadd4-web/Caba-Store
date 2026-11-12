import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getI18n } from '@/lib/i18n/server'
import { listeAbonnementsAdmin } from '@/lib/seller-billing'

// GET /api/admin/abonnements — tous les vendeurs facturés, impayés en tête
export async function GET() {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  return NextResponse.json(await listeAbonnementsAdmin())
}
