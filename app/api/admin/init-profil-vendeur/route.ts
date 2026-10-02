import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'

/**
 * GET    → vérifie si un profil vendeur admin existe encore en base
 * DELETE → supprime ce profil (nettoyage)
 *
 * NOTE : Le POST a été supprimé. Les produits admin (vendeurId: null)
 * ont automatiquement la priorité 0 via le tri applicatif
 * (vendeur?.prioriteAffichage ?? 0). Aucun VendeurProfile n'est nécessaire.
 */

// ── GET : vérification ─────────────────────────────────────────────────────────
export async function GET() {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })

  const profil = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
    include: { _count: { select: { products: true } } },
  })

  if (!profil)
    return NextResponse.json({ existe: false })

  return NextResponse.json({
    existe:      true,
    vendeurId:   profil.id,
    nomBoutique: profil.nomBoutique,
    nbProduits:  profil._count.products,
  })
}

// ── DELETE : nettoyage du profil admin créé par erreur ────────────────────────
export async function DELETE() {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })

  const profil = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      abonnement: { include: { paiements: true } },
      _count: { select: { products: true } },
    },
  })

  if (!profil)
    return NextResponse.json({ error: t.msg.noAdminSellerProfile }, { status: 404 })

  if (profil._count.products > 0) {
    return NextResponse.json({
      error: t.msg.profileHasProducts(profil._count.products),
    }, { status: 400 })
  }

  // Supprimer dans l'ordre : paiements → abonnement → profil
  await prisma.$transaction(async (tx) => {
    if (profil.abonnement) {
      if (profil.abonnement.paiements.length > 0)
        await tx.paiement.deleteMany({ where: { abonnementId: profil.abonnement.id } })
      await tx.abonnement.delete({ where: { id: profil.abonnement.id } })
    }
    await tx.vendeurProfile.delete({ where: { id: profil.id } })
  })

  return NextResponse.json({ message: t.msg.adminSellerProfileDeleted })
}