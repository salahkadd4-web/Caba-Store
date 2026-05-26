/**
 * Crée un compte client de test.
 * Usage : npx tsx scripts/seed-test-client.ts
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

const TEST_CLIENT = {
  email:      'client.test@caba.dz',
  motDePasse: 'Client@2000',
  prenom:     'Client',
  nom:        'Test',
  telephone:  '0555000002',
}

async function main() {
  const hash = await bcrypt.hash(TEST_CLIENT.motDePasse, 10)

  const existing = await prisma.user.findUnique({
    where: { email: TEST_CLIENT.email },
  })

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data:  { motDePasse: hash, role: 'CLIENT' },
    })
    console.log('Compte client existait → mot de passe réinitialisé')
  } else {
    await prisma.user.create({
      data: {
        email:      TEST_CLIENT.email,
        telephone:  TEST_CLIENT.telephone,
        prenom:     TEST_CLIENT.prenom,
        nom:        TEST_CLIENT.nom,
        motDePasse: hash,
        role:       'CLIENT',
      },
    })
    console.log('Compte client créé')
  }

  console.log('\n=== Compte client de test ===')
  console.log('Email        :', TEST_CLIENT.email)
  console.log('Téléphone    :', TEST_CLIENT.telephone)
  console.log('Mot de passe :', TEST_CLIENT.motDePasse)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
