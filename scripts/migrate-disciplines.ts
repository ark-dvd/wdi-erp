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

  // Get all contacts with disciplines (array field)
  const contacts = await prisma.contact.findMany({
    where: {
      disciplines: { isEmpty: false }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      disciplines: true
    }
  })

  // Get all organizations with disciplines
  const organizations = await prisma.organization.findMany({
    where: {
      disciplines: { isEmpty: false }
    },
    select: {
      id: true,
      name: true,
      disciplines: true
    }
  })

  console.log(`📊 Found ${contacts.length} contacts and ${organizations.length} organizations with disciplines`)

  let updatedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  // Migrate contacts
  for (const contact of contacts) {
    const oldDisciplines = contact.disciplines
    const newDisciplines = oldDisciplines.map(d => DISCIPLINE_MIGRATION_MAP[d] || d)

    // Check if any discipline changed
    const hasChanges = oldDisciplines.some((d, i) => d !== newDisciplines[i])

    if (hasChanges) {
      try {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { disciplines: newDisciplines }
        })
        console.log(`✅ Contact: "${contact.firstName} ${contact.lastName}" - updated ${oldDisciplines.length} discipline(s)`)
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

  // Migrate organizations
  for (const org of organizations) {
    const oldDisciplines = org.disciplines
    const newDisciplines = oldDisciplines.map(d => DISCIPLINE_MIGRATION_MAP[d] || d)

    // Check if any discipline changed
    const hasChanges = oldDisciplines.some((d, i) => d !== newDisciplines[i])

    if (hasChanges) {
      try {
        await prisma.organization.update({
          where: { id: org.id },
          data: { disciplines: newDisciplines }
        })
        console.log(`✅ Organization: "${org.name}" - updated ${oldDisciplines.length} discipline(s)`)
        updatedCount++
      } catch (err) {
        const errorMsg = `Failed to update organization ${org.id}: ${err}`
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
