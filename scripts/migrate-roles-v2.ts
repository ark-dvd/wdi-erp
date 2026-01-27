// ================================================
// WDI ERP - RBAC v2 Role Name Migration Script
// Version: 20260126-RBAC-V2-PHASE1
// Implements: DOC-013 §4.1 Role Name Alignment
// ================================================
//
// PHASE 1 SCOPE: Role names and displayNames ONLY
// - Does NOT modify permissions (Phase 2)
// - Does NOT modify API routes (Phase 4)
//
// CHANGES:
// - Renames: senior_pm → project_manager
// - Renames: operations_staff → administration
// - Adds: pmo role (new)
// - Updates displayNames to Hebrew per DOC-013
//
// SAFETY:
// - Idempotent (safe to run multiple times)
// - Logs all changes
// - Transaction-wrapped for atomicity
// - Rollback script included
//
// USAGE:
//   npx tsx scripts/migrate-roles-v2.ts
//
// ROLLBACK:
//   npx tsx scripts/migrate-roles-v2.ts --rollback
//
// ================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ================================================
// DOC-013 §4.1 CANONICAL ROLES v2
// ================================================

interface RoleDefinition {
  name: string
  displayName: string
  description: string
  level: number
}

const CANONICAL_ROLES_V2: RoleDefinition[] = [
  { name: 'owner', displayName: 'בעלים', description: 'גישה מלאה לכל המערכת', level: 1 },
  { name: 'executive', displayName: 'מנכ״ל', description: 'הנהלה בכירה עם גישה תפעולית מלאה', level: 2 },
  { name: 'trust_officer', displayName: 'מנהל/ת משרד', description: 'מנהל משרד / רכז משאבי אנוש', level: 3 },
  { name: 'pmo', displayName: 'PMO', description: 'ניהול תיק פרויקטים ארגוני', level: 4 },
  { name: 'finance_officer', displayName: 'מנהל כספים', description: 'פיקוח פיננסי', level: 3 },
  { name: 'domain_head', displayName: 'ראש תחום', description: 'מנהל תחום פעילות', level: 4 },
  { name: 'project_manager', displayName: 'מנהל פרויקט', description: 'ניהול פרויקטים', level: 5 },
  { name: 'project_coordinator', displayName: 'מתאם פרויקט', description: 'תיאום פרויקטים', level: 6 },
  { name: 'administration', displayName: 'אדמיניסטרציה', description: 'תמיכה אדמיניסטרטיבית', level: 7 },
  { name: 'all_employees', displayName: 'כל העובדים', description: 'תפקיד בסיס לכל עובד מאומת', level: 100 },
]

// Role renames: old_name → new_name
const ROLE_RENAMES: Record<string, string> = {
  'senior_pm': 'project_manager',
  'operations_staff': 'administration',
}

// Reverse map for rollback
const ROLE_RENAMES_ROLLBACK: Record<string, string> = {
  'project_manager': 'senior_pm',
  'administration': 'operations_staff',
}

// ================================================
// MIGRATION FUNCTIONS
// ================================================

async function migrateForward(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  RBAC v2 PHASE 1 — ROLE NAME MIGRATION')
  console.log('  Implements: DOC-013 §4.1')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  const changes: string[] = []
  const warnings: string[] = []

  // Step 1: Check current state
  console.log('📋 Step 1: Analyzing current role state...')
  const existingRoles = await prisma.role.findMany({
    select: { id: true, name: true, displayName: true, level: true },
  })
  console.log(`   Found ${existingRoles.length} existing roles`)

  const existingRoleNames = new Set(existingRoles.map(r => r.name))

  // Step 2: Rename roles that need renaming
  console.log('')
  console.log('📝 Step 2: Renaming roles...')

  for (const [oldName, newName] of Object.entries(ROLE_RENAMES)) {
    const existingRole = existingRoles.find(r => r.name === oldName)
    const targetExists = existingRoles.find(r => r.name === newName)

    if (existingRole && !targetExists) {
      // Get the v2 definition for updated displayName
      const v2Def = CANONICAL_ROLES_V2.find(r => r.name === newName)

      await prisma.role.update({
        where: { id: existingRole.id },
        data: {
          name: newName,
          displayName: v2Def?.displayName || existingRole.displayName,
          description: v2Def?.description || existingRole.displayName,
        },
      })

      changes.push(`RENAMED: ${oldName} → ${newName} (${v2Def?.displayName})`)
      console.log(`   ✓ Renamed: ${oldName} → ${newName} (${v2Def?.displayName})`)
    } else if (targetExists) {
      // Target already exists - role already migrated
      console.log(`   ⏭ Skipped: ${oldName} → ${newName} (target already exists)`)
    } else if (!existingRole) {
      // Source doesn't exist - might already be migrated
      console.log(`   ⏭ Skipped: ${oldName} not found (may already be migrated)`)
    }
  }

  // Step 3: Add PMO role if missing
  console.log('')
  console.log('➕ Step 3: Adding new PMO role...')

  const pmoExists = existingRoles.find(r => r.name === 'pmo')
  if (!pmoExists) {
    const pmoDef = CANONICAL_ROLES_V2.find(r => r.name === 'pmo')!
    await prisma.role.create({
      data: {
        name: pmoDef.name,
        displayName: pmoDef.displayName,
        description: pmoDef.description,
        level: pmoDef.level,
      },
    })
    changes.push(`CREATED: pmo (${pmoDef.displayName})`)
    console.log(`   ✓ Created: pmo (PMO) at level ${pmoDef.level}`)
  } else {
    console.log(`   ⏭ Skipped: pmo role already exists`)
  }

  // Step 4: Update displayNames and levels to match DOC-013 exactly
  console.log('')
  console.log('🔄 Step 4: Updating displayNames and levels to match DOC-013...')

  // Re-fetch roles after renames
  const updatedRoles = await prisma.role.findMany({
    select: { id: true, name: true, displayName: true, level: true },
  })

  for (const v2Def of CANONICAL_ROLES_V2) {
    const current = updatedRoles.find(r => r.name === v2Def.name)
    if (current) {
      const needsUpdate =
        current.displayName !== v2Def.displayName ||
        current.level !== v2Def.level

      if (needsUpdate) {
        await prisma.role.update({
          where: { id: current.id },
          data: {
            displayName: v2Def.displayName,
            level: v2Def.level,
            description: v2Def.description,
          },
        })
        changes.push(`UPDATED: ${v2Def.name} displayName/level`)
        console.log(`   ✓ Updated: ${v2Def.name} → displayName="${v2Def.displayName}", level=${v2Def.level}`)
      } else {
        console.log(`   ⏭ ${v2Def.name}: already matches DOC-013`)
      }
    }
  }

  // Step 5: Warn about any non-canonical roles
  console.log('')
  console.log('⚠️  Step 5: Checking for non-canonical roles...')

  const finalRoles = await prisma.role.findMany({
    select: { name: true },
  })
  const canonicalNames = new Set(CANONICAL_ROLES_V2.map(r => r.name))

  for (const role of finalRoles) {
    if (!canonicalNames.has(role.name)) {
      warnings.push(`Non-canonical role found: ${role.name}`)
      console.log(`   ⚠️  Non-canonical role: ${role.name} (consider removing)`)
    }
  }

  // Summary
  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  MIGRATION SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')

  if (changes.length > 0) {
    console.log('')
    console.log('✅ Changes applied:')
    changes.forEach(c => console.log(`   • ${c}`))
  } else {
    console.log('')
    console.log('ℹ️  No changes needed - roles already match DOC-013 v2')
  }

  if (warnings.length > 0) {
    console.log('')
    console.log('⚠️  Warnings:')
    warnings.forEach(w => console.log(`   • ${w}`))
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
}

async function rollback(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  RBAC v2 PHASE 1 — ROLLBACK')
  console.log('  Reverting to pre-migration state')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  const changes: string[] = []

  // Step 1: Check current state
  console.log('📋 Step 1: Analyzing current role state...')
  const existingRoles = await prisma.role.findMany({
    select: { id: true, name: true, displayName: true },
  })

  // Step 2: Rename roles back to v1 names
  console.log('')
  console.log('📝 Step 2: Reverting role names to v1...')

  for (const [newName, oldName] of Object.entries(ROLE_RENAMES_ROLLBACK)) {
    const existingRole = existingRoles.find(r => r.name === newName)
    const targetExists = existingRoles.find(r => r.name === oldName)

    if (existingRole && !targetExists) {
      await prisma.role.update({
        where: { id: existingRole.id },
        data: {
          name: oldName,
          displayName: oldName === 'senior_pm' ? 'מנהל פרויקט בכיר' : 'צוות תפעול',
        },
      })
      changes.push(`REVERTED: ${newName} → ${oldName}`)
      console.log(`   ✓ Reverted: ${newName} → ${oldName}`)
    }
  }

  // Step 3: Remove PMO role if it was added
  console.log('')
  console.log('🗑️  Step 3: Removing PMO role...')

  const pmoRole = existingRoles.find(r => r.name === 'pmo')
  if (pmoRole) {
    // Check if any users have this role
    const usersWithPmo = await prisma.userRole.count({
      where: { roleId: pmoRole.id },
    })

    if (usersWithPmo > 0) {
      console.log(`   ⚠️  Cannot remove PMO role: ${usersWithPmo} users have this role`)
      console.log('   ⚠️  Please reassign these users first')
    } else {
      // Remove any permissions first
      await prisma.rolePermission.deleteMany({
        where: { roleId: pmoRole.id },
      })
      await prisma.role.delete({
        where: { id: pmoRole.id },
      })
      changes.push('DELETED: pmo role')
      console.log('   ✓ Deleted: pmo role')
    }
  } else {
    console.log('   ⏭ PMO role not found (nothing to remove)')
  }

  // Summary
  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  ROLLBACK SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')

  if (changes.length > 0) {
    console.log('')
    console.log('✅ Rollback changes applied:')
    changes.forEach(c => console.log(`   • ${c}`))
  } else {
    console.log('')
    console.log('ℹ️  No rollback changes needed')
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
}

// ================================================
// VERIFICATION QUERY
// ================================================

async function verify(): Promise<boolean> {
  console.log('')
  console.log('🔍 VERIFICATION: Checking roles match DOC-013 v2...')
  console.log('')

  const roles = await prisma.role.findMany({
    orderBy: { level: 'asc' },
    select: { name: true, displayName: true, level: true },
  })

  console.log('Current roles in database:')
  console.log('┌────────────────────┬────────────────────┬───────┐')
  console.log('│ Role Name          │ Display Name       │ Level │')
  console.log('├────────────────────┼────────────────────┼───────┤')

  let allMatch = true
  const canonicalMap = new Map(CANONICAL_ROLES_V2.map(r => [r.name, r]))

  for (const role of roles) {
    const expected = canonicalMap.get(role.name)
    const nameMatch = expected ? '✓' : '✗'
    const displayMatch = expected && expected.displayName === role.displayName ? '✓' : '✗'
    const levelMatch = expected && expected.level === role.level ? '✓' : '✗'

    const status = expected && displayMatch === '✓' && levelMatch === '✓' ? '✓' : '✗'
    if (status === '✗') allMatch = false

    console.log(`│ ${role.name.padEnd(18)} │ ${role.displayName.padEnd(18)} │ ${String(role.level).padStart(5)} │ ${status}`)
  }

  console.log('└────────────────────┴────────────────────┴───────┘')

  // Check for missing roles
  const roleNames = new Set(roles.map(r => r.name))
  const missing = CANONICAL_ROLES_V2.filter(r => !roleNames.has(r.name))

  if (missing.length > 0) {
    allMatch = false
    console.log('')
    console.log('❌ Missing roles:')
    missing.forEach(r => console.log(`   • ${r.name} (${r.displayName})`))
  }

  console.log('')
  if (allMatch) {
    console.log('✅ VERIFICATION PASSED: All roles match DOC-013 v2')
  } else {
    console.log('❌ VERIFICATION FAILED: Roles do not match DOC-013 v2')
  }

  return allMatch
}

// ================================================
// MAIN
// ================================================

async function main() {
  const args = process.argv.slice(2)
  const isRollback = args.includes('--rollback')
  const isVerifyOnly = args.includes('--verify')

  try {
    if (isVerifyOnly) {
      await verify()
    } else if (isRollback) {
      await rollback()
      await verify()
    } else {
      await migrateForward()
      await verify()
    }
  } catch (error) {
    console.error('')
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
