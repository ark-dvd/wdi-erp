// ================================================
// Discipline Migration Script
// Version: 20260126
// Purpose: Update existing contacts with new discipline values
// Usage: npx ts-node scripts/migrate-disciplines.ts
// ================================================

import { PrismaClient } from '@prisma/client'
import { DISCIPLINE_MIGRATION_MAP } from '../src/lib/contact-constants'

const prisma = new PrismaClient()

async function migrateDisciplines() {
  console.log('🔄 Starting discipline migration...')
  console.log(`📋 Migration map has ${Object.keys(DISCIPLINE_MIGRATION_MAP).length} entries`)

  // Get all contacts with disciplines
  const contacts = await prisma.contact.findMany({
    where: {
      discipline: { not: null }
    },
    select: {
      id: true,
      name: true,
      discipline: true
    }
  })

  console.log(`📊 Found ${contacts.length} contacts with disciplines`)

  let updatedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  for (const contact of contacts) {
    const oldDiscipline = contact.discipline
    if (!oldDiscipline) continue

    const newDiscipline = DISCIPLINE_MIGRATION_MAP[oldDiscipline]

    if (newDiscipline && newDiscipline !== oldDiscipline) {
      try {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { discipline: newDiscipline }
        })
        console.log(`✅ Updated: "${contact.name}" - "${oldDiscipline}" → "${newDiscipline}"`)
        updatedCount++
      } catch (err) {
        const errorMsg = `Failed to update contact ${contact.id}: ${err}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    } else {
      skippedCount++
    }
  }

  console.log('')
  console.log('📊 Migration Summary:')
  console.log(`   ✅ Updated: ${updatedCount}`)
  console.log(`   ⏭️  Skipped (no change needed): ${skippedCount}`)
  console.log(`   ❌ Errors: ${errors.length}`)

  if (errors.length > 0) {
    console.log('')
    console.log('❌ Errors:')
    errors.forEach(e => console.log(`   ${e}`))
  }

  console.log('')
  console.log('✅ Discipline migration completed!')
}

migrateDisciplines()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
