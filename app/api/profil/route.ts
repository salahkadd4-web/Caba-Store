import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import bcrypt from 'bcryptjs'

// ── Helpers encodage/décodage wilaya + adresse dans un seul champ ──────────
const SEP = '|||'

function encodeWilayaAdresse(wilaya: string, adresse: string): string {
  // Si adresse vide, on stocke juste la wilaya (rétrocompatible)
  if (!adresse.trim()) return wilaya
  return `${wilaya}${SEP}${adresse}`
}

function decodeWilayaAdresse(value: string | null): { wilaya: string; adresse: string } {
  if (!value) return { wilaya: '', adresse: '' }
  const idx = value.indexOf(SEP)
  if (idx === -1) return { wilaya: value, adresse: '' }
  return { wilaya: value.slice(0, idx), adresse: value.slice(idx + SEP.length) }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: {
        nom: true, prenom: true, email: true,
        telephone: true, age: true, genre: true, wilaya: true,
      },
    })

    if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    // Décoder wilaya + adresse avant d'envoyer au client
    const { wilaya, adresse } = decodeWilayaAdresse(user.wilaya)

    return NextResponse.json({ ...user, wilaya, adresse })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { nom, prenom, telephone, age, genre, wilaya, adresse, motDePasse } = await req.json()

    if (nom    !== undefined && !nom)    return NextResponse.json({ error: 'Nom requis' },    { status: 400 })
    if (prenom !== undefined && !prenom) return NextResponse.json({ error: 'Prénom requis' }, { status: 400 })

    const modifieInfosSensibles = nom    !== undefined ||
                                  prenom !== undefined ||
                                  genre  !== undefined ||
                                  age    !== undefined ||
                                  wilaya !== undefined ||
                                  adresse !== undefined

    if (modifieInfosSensibles) {
      if (!motDePasse) {
        return NextResponse.json(
          { error: 'Mot de passe requis pour confirmer les modifications' },
          { status: 400 }
        )
      }
      const user = await prisma.user.findUnique({ where: { id: token.id as string } })
      if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
      if (!user.motDePasse) {
        return NextResponse.json(
          { error: "Compte Google — définissez d'abord un mot de passe dans votre profil" },
          { status: 400 }
        )
      }
      const valid = await bcrypt.compare(motDePasse, user.motDePasse)
      if (!valid) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 400 })
    }

    if (telephone) {
      const existing = await prisma.user.findFirst({
        where: { telephone, NOT: { id: token.id as string } },
      })
      if (existing) return NextResponse.json({ error: 'Ce numéro est déjà utilisé' }, { status: 400 })
    }

    // Si wilaya ou adresse changent, recalculer la valeur encodée
    let wilayaEncoded: string | undefined = undefined
    if (wilaya !== undefined || adresse !== undefined) {
      // Lire la valeur actuelle pour ne pas perdre l'une des deux parties
      const current = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { wilaya: true },
      })
      const { wilaya: currentWilaya, adresse: currentAdresse } = decodeWilayaAdresse(current?.wilaya ?? null)
      const newWilaya  = wilaya  !== undefined ? (wilaya  || '')  : currentWilaya
      const newAdresse = adresse !== undefined ? (adresse || '') : currentAdresse
      wilayaEncoded = encodeWilayaAdresse(newWilaya, newAdresse) || null as any
    }

    const updated = await prisma.user.update({
      where: { id: token.id as string },
      data: {
        ...(nom              !== undefined && { nom }),
        ...(prenom           !== undefined && { prenom }),
        ...(telephone        !== undefined && { telephone: telephone || null }),
        ...(age              !== undefined && { age: age || null }),
        ...(genre            !== undefined && { genre: genre || null }),
        ...(wilayaEncoded    !== undefined && { wilaya: wilayaEncoded || null }),
      },
    })

    return NextResponse.json({ message: 'Profil mis à jour', user: updated })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}