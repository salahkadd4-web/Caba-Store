import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const produit = await prisma.product.findUnique({
    where: { id },
    select: {
      vendeur: {
        include: {
          user: {
            select: { nom: true, prenom: true, telephone: true, email: true, wilaya: true },
          },
        },
      },
    },
  })

  if (!produit) return NextResponse.json(null)

  // Produit avec vendeur
  if (produit.vendeur) {
    return NextResponse.json({
      id:          produit.vendeur.id,
      nomBoutique: produit.vendeur.nomBoutique,
      isAdmin:     false,
      user:        produit.vendeur.user,
    })
  }

  // Produit admin → on retourne le premier admin
  const admin = await prisma.user.findFirst({
    where:  { role: 'ADMIN' },
    select: { nom: true, prenom: true, telephone: true, email: true, wilaya: true },
  })

  if (!admin) return NextResponse.json(null)

  return NextResponse.json({
    id:          'admin',
    nomBoutique: 'Caba Store',
    isAdmin:     true,
    user:        admin,
  })
}