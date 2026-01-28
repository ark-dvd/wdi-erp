/**
 * Domain Migration Script
 * Version: 20260128-v2
 * Purpose: Properly set up Domain RBAC infrastructure
 *
 * This script:
 * 1. Creates domains if they don't exist (בטחוני, מסחרי, תעשייתי)
 * 2. Lists all projects needing domainId assignment
 * 3. Lists all users with domain_head role needing UserDomainAssignment
 * 4. Pass 1: Assigns domains to projects based on category mapping
 * 5. Pass 2: Buildings/quarters inherit domain from parent project
 * 6. Summary and next steps
 *
 * Inheritance logic:
 * - 3414-A-02 (no category) → inherits from 3414 (בטחוני → security)
 * - 6043-02 (no category) → inherits from 6043 (תשתיות → industrial)
 * - 9286-A-02 (no category) → inherits from 9286 (ציבורי → commercial)
 *
 * Run: npx ts-node prisma/migrate-domains.ts
 * Apply: npx ts-node prisma/migrate-domains.ts --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Domain definitions
const DOMAINS = [
  { name: 'security', displayName: 'בטחוני', description: 'פרויקטים בטחוניים וצבאיים' },
  { name: 'commercial', displayName: 'מסחרי', description: 'פרויקטים מסחריים ועסקיים' },
  { name: 'industrial', displayName: 'תעשייתי', description: 'פרויקטים תעשייתיים' },
]

// Category to Domain mapping
// Projects with these categories will be assigned to the corresponding domain
const CATEGORY_TO_DOMAIN: Record<string, string> = {
  'בטחוני': 'security',
  'מסחרי': 'commercial',
  'תעשייתי': 'industrial',
  // Categories that map to commercial
  'מגורים': 'commercial',
  'תשתיות': 'industrial',
  'ציבורי': 'commercial',
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║       DOMAIN MIGRATION SCRIPT - WDI ERP                    ║')
  console.log('║       Version: 20260128                                    ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Create domains if they don't exist
  // ═══════════════════════════════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ STEP 1: Creating/Verifying Domains                         │')
  console.log('└─────────────────────────────────────────────────────────────┘')

  const domainMap: Record<string, string> = {}

  for (const domain of DOMAINS) {
    const existing = await prisma.domain.findUnique({
      where: { name: domain.name }
    })

    if (existing) {
      console.log(`   ✓ Domain "${domain.displayName}" already exists (${existing.id})`)
      domainMap[domain.name] = existing.id
    } else {
      const created = await prisma.domain.create({
        data: domain
      })
      console.log(`   ✓ Created domain "${domain.displayName}" (${created.id})`)
      domainMap[domain.name] = created.id
    }
  }

  console.log('')

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Analyze projects needing domain assignment
  // ═══════════════════════════════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ STEP 2: Projects Needing Domain Assignment                 │')
  console.log('└─────────────────────────────────────────────────────────────┘')

  const projectsWithoutDomain = await prisma.project.findMany({
    where: { domainId: null },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      category: true,
      level: true,
      state: true,
    },
    orderBy: { projectNumber: 'asc' }
  })

  console.log(`\n   Found ${projectsWithoutDomain.length} projects without domain assignment:\n`)

  if (projectsWithoutDomain.length > 0) {
    // Group by category for analysis
    const byCategory: Record<string, typeof projectsWithoutDomain> = {}
    const noCategory: typeof projectsWithoutDomain = []

    for (const project of projectsWithoutDomain) {
      if (project.category) {
        // Handle comma-separated categories (take first one)
        const primaryCategory = project.category.split(',')[0].trim()
        if (!byCategory[primaryCategory]) {
          byCategory[primaryCategory] = []
        }
        byCategory[primaryCategory].push(project)
      } else {
        noCategory.push(project)
      }
    }

    // Print by category
    for (const [category, projects] of Object.entries(byCategory)) {
      const suggestedDomain = CATEGORY_TO_DOMAIN[category] || 'UNKNOWN'
      console.log(`   📁 Category: "${category}" → Suggested Domain: ${suggestedDomain}`)
      for (const p of projects) {
        console.log(`      • ${p.projectNumber} - ${p.name} [${p.level}] (${p.state})`)
      }
      console.log('')
    }

    if (noCategory.length > 0) {
      console.log(`   ⚠️  Projects WITHOUT category (need manual assignment):`)
      for (const p of noCategory) {
        console.log(`      • ${p.projectNumber} - ${p.name} [${p.level}] (${p.state})`)
      }
      console.log('')
    }
  } else {
    console.log('   ✓ All projects have domain assignments')
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Analyze domain_head users needing UserDomainAssignment
  // ═══════════════════════════════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ STEP 3: Domain Head Users Needing Domain Assignment        │')
  console.log('└─────────────────────────────────────────────────────────────┘')

  // Find the domain_head role
  const domainHeadRole = await prisma.role.findUnique({
    where: { name: 'domain_head' }
  })

  if (!domainHeadRole) {
    console.log('   ⚠️  domain_head role not found in database')
  } else {
    // Find users with domain_head role
    const domainHeadUsers = await prisma.userRole.findMany({
      where: { roleId: domainHeadRole.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            employee: {
              select: { firstName: true, lastName: true }
            },
            domainAssignments: {
              include: {
                domain: { select: { displayName: true } }
              }
            }
          }
        }
      }
    })

    console.log(`\n   Found ${domainHeadUsers.length} users with domain_head role:\n`)

    const usersNeedingAssignment: typeof domainHeadUsers = []
    const usersWithAssignment: typeof domainHeadUsers = []

    for (const ur of domainHeadUsers) {
      if (ur.user.domainAssignments.length === 0) {
        usersNeedingAssignment.push(ur)
      } else {
        usersWithAssignment.push(ur)
      }
    }

    if (usersWithAssignment.length > 0) {
      console.log('   ✓ Users with domain assignments:')
      for (const ur of usersWithAssignment) {
        const displayName = ur.user.employee
          ? `${ur.user.employee.firstName} ${ur.user.employee.lastName}`
          : ur.user.name || ur.user.email
        const domains = ur.user.domainAssignments.map(da => da.domain.displayName).join(', ')
        console.log(`      • ${displayName} (${ur.user.email}) → ${domains}`)
      }
      console.log('')
    }

    if (usersNeedingAssignment.length > 0) {
      console.log('   ⚠️  Users NEEDING domain assignment:')
      for (const ur of usersNeedingAssignment) {
        const displayName = ur.user.employee
          ? `${ur.user.employee.firstName} ${ur.user.employee.lastName}`
          : ur.user.name || ur.user.email
        console.log(`      • ${displayName} (${ur.user.email}) - NO DOMAIN ASSIGNED`)
      }
      console.log('')
    }

    if (usersNeedingAssignment.length === 0 && domainHeadUsers.length > 0) {
      console.log('   ✓ All domain_head users have domain assignments')
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Perform automatic domain assignment based on category
  // ═══════════════════════════════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ STEP 4: Automatic Domain Assignment (Top-Level Projects)   │')
  console.log('└─────────────────────────────────────────────────────────────┘')

  const args = process.argv.slice(2)
  const dryRun = !args.includes('--apply')

  if (dryRun) {
    console.log('\n   🔍 DRY RUN MODE - No changes will be made')
    console.log('   Run with --apply to execute changes\n')
  } else {
    console.log('\n   🚀 APPLY MODE - Making changes to database\n')
  }

  let projectsUpdatedByCategory = 0
  let projectsSkipped = 0

  // PASS 1: Assign domains to projects that have a category
  console.log('   --- Pass 1: Assign by category ---\n')

  for (const project of projectsWithoutDomain) {
    if (!project.category) {
      // Will be handled in Pass 2 (inheritance)
      continue
    }

    const primaryCategory = project.category.split(',')[0].trim()
    const domainName = CATEGORY_TO_DOMAIN[primaryCategory]

    if (!domainName) {
      console.log(`   ⏭️  SKIP: ${project.projectNumber} - Category "${primaryCategory}" not mapped`)
      projectsSkipped++
      continue
    }

    const domainId = domainMap[domainName]
    if (!domainId) {
      console.log(`   ❌ ERROR: Domain "${domainName}" not found in map`)
      continue
    }

    if (dryRun) {
      console.log(`   📝 WOULD UPDATE: ${project.projectNumber} → ${domainName} (by category)`)
    } else {
      await prisma.project.update({
        where: { id: project.id },
        data: { domainId }
      })
      console.log(`   ✓ UPDATED: ${project.projectNumber} → ${domainName} (by category)`)
    }
    projectsUpdatedByCategory++
  }

  console.log(`\n   Pass 1 Summary: ${projectsUpdatedByCategory} projects ${dryRun ? 'would be' : ''} updated by category`)

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Inherit domain from parent for buildings/quarters
  // ═══════════════════════════════════════════════════════════════════════
  console.log('')
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ STEP 5: Domain Inheritance (Buildings/Quarters)            │')
  console.log('└─────────────────────────────────────────────────────────────┘')
  console.log('\n   --- Pass 2: Inherit from parent ---\n')

  // Re-fetch projects without domain (some may have been updated in Pass 1)
  const projectsStillWithoutDomain = await prisma.project.findMany({
    where: { domainId: null },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      category: true,
      level: true,
      state: true,
      parentId: true,
    },
    orderBy: { projectNumber: 'asc' }
  })

  let projectsUpdatedByInheritance = 0
  let projectsNeedingManual = 0

  for (const project of projectsStillWithoutDomain) {
    if (!project.parentId) {
      // Top-level project without category - needs manual assignment
      console.log(`   ⚠️  MANUAL: ${project.projectNumber} - Top-level project without category`)
      projectsNeedingManual++
      continue
    }

    // Find parent and get its domain
    const parent = await prisma.project.findUnique({
      where: { id: project.parentId },
      select: { projectNumber: true, domainId: true, domain: { select: { name: true, displayName: true } } }
    })

    if (!parent) {
      console.log(`   ❌ ERROR: ${project.projectNumber} - Parent not found`)
      continue
    }

    if (!parent.domainId) {
      // Parent also has no domain - try grandparent
      const grandparent = await prisma.project.findFirst({
        where: { children: { some: { id: project.parentId } } },
        select: { projectNumber: true, domainId: true, domain: { select: { name: true, displayName: true } } }
      })

      if (grandparent?.domainId) {
        if (dryRun) {
          console.log(`   📝 WOULD UPDATE: ${project.projectNumber} → ${grandparent.domain?.name} (inherited from grandparent ${grandparent.projectNumber})`)
        } else {
          await prisma.project.update({
            where: { id: project.id },
            data: { domainId: grandparent.domainId }
          })
          console.log(`   ✓ UPDATED: ${project.projectNumber} → ${grandparent.domain?.name} (inherited from grandparent ${grandparent.projectNumber})`)
        }
        projectsUpdatedByInheritance++
      } else {
        console.log(`   ⚠️  MANUAL: ${project.projectNumber} - Parent ${parent.projectNumber} has no domain`)
        projectsNeedingManual++
      }
      continue
    }

    // Inherit from parent
    if (dryRun) {
      console.log(`   📝 WOULD UPDATE: ${project.projectNumber} → ${parent.domain?.name} (inherited from ${parent.projectNumber})`)
    } else {
      await prisma.project.update({
        where: { id: project.id },
        data: { domainId: parent.domainId }
      })
      console.log(`   ✓ UPDATED: ${project.projectNumber} → ${parent.domain?.name} (inherited from ${parent.projectNumber})`)
    }
    projectsUpdatedByInheritance++
  }

  console.log(`\n   Pass 2 Summary: ${projectsUpdatedByInheritance} projects ${dryRun ? 'would be' : ''} updated by inheritance`)

  const totalUpdated = projectsUpdatedByCategory + projectsUpdatedByInheritance
  console.log(`\n   Total: ${totalUpdated} projects ${dryRun ? 'would be' : ''} updated, ${projectsNeedingManual} need manual assignment`)

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: Summary and next steps
  // ═══════════════════════════════════════════════════════════════════════
  console.log('')
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│ SUMMARY & NEXT STEPS                                       │')
  console.log('└─────────────────────────────────────────────────────────────┘')
  console.log('')
  console.log('   Domain Infrastructure Status:')
  console.log(`   • Domains created: ${Object.keys(domainMap).length}`)
  console.log(`   • Projects updated by category: ${projectsUpdatedByCategory}`)
  console.log(`   • Projects updated by inheritance: ${projectsUpdatedByInheritance}`)
  console.log(`   • Projects needing manual assignment: ${projectsNeedingManual}`)
  console.log('')

  if (dryRun) {
    console.log('   To apply changes, run:')
    console.log('   npx ts-node prisma/migrate-domains.ts --apply')
    console.log('')
  }

  console.log('   Manual steps required:')
  console.log('   1. Top-level projects without category need manual domain assignment')
  console.log('   2. Domain head users need domain assignment via Admin Console')
  console.log('   3. Verify RBAC permissions after migration')
  console.log('')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
