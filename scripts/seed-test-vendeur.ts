/**
 * Crée un compte vendeur de test (statut APPROUVE).
 * Usage : npx tsx scripts/seed-test-vendeur.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma  = new PrismaClient({ adapter })

const TEST_VENDEUR = {
  email:       'vendeur.test@caba.dz',
  motDePasse:  'Vendeur@2000',
  prenom:      'Vendeur',
  nom:         'Test',
  telephone:   '0555000001',
  nomBoutique: 'Boutique Test',
  description: 'Boutique de test pour le développement',
}

async function main() {
  const hash = await bcrypt.hash(TEST_VENDEUR.motDePasse, 10)

  const existing = await prisma.user.findUnique({
    where: { email: TEST_VENDEUR.email },
    include: { vendeurProfile: true },
  })

  if (existing) {
    console.log('Compte vendeur existe déjà → mise à jour mot de passe + statut APPROUVE')
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        motDePasse: hash,
        role:       'VENDEUR',
        vendeurProfile: existing.vendeurProfile
          ? { update: { statut: 'APPROUVE' } }
          : {
              create: {
                statut:      'APPROUVE',
                nomBoutique: TEST_VENDEUR.nomBoutique,
                description: TEST_VENDEUR.description,
              },
            },
      },
    })
  } else {
    await prisma.user.create({
      data: {
        email:      TEST_VENDEUR.email,
        telephone:  TEST_VENDEUR.telephone,
        prenom:     TEST_VENDEUR.prenom,
        nom:        TEST_VENDEUR.nom,
        motDePasse: hash,
        role:       'VENDEUR',
        vendeurProfile: {
          create: {
            statut:      'APPROUVE',
            nomBoutique: TEST_VENDEUR.nomBoutique,
            description: TEST_VENDEUR.description,
          },
        },
      },
    })
    console.log('Compte vendeur créé')
  }

  console.log('\n=== Compte vendeur de test ===')
  console.log('Email        :', TEST_VENDEUR.email)
  console.log('Téléphone    :', TEST_VENDEUR.telephone)
  console.log('Mot de passe :', TEST_VENDEUR.motDePasse)
  console.log('Statut       : APPROUVE')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
