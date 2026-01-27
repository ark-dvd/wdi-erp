// ================================================
// WDI ERP - RBAC v2 Permission Seed Script
// Version: 20260126-RBAC-V2-PHASE2
// Implements: DOC-013 §5 (Scopes) + DOC-014 §5 (Permission Matrix)
// ================================================
//
// PHASE 2 SCOPE: Permission schema and role-permission mappings
// - Creates permissions with scope dimension
// - Assigns permissions to all 10 roles per DOC-014
// - Idempotent (safe to run multiple times)
//
// USAGE:
//   DATABASE_URL='...' npx tsx scripts/seed-permissions-v2.ts
//
// VERIFY:
//   DATABASE_URL='...' npx tsx scripts/seed-permissions-v2.ts --verify
//
// ================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ================================================
// DOC-013 §5.1 SCOPE DEFINITIONS
// ================================================

type Scope = 'ALL' | 'DOMAIN' | 'ASSIGNED' | 'OWN' | 'SELF' | 'MAIN_PAGE' | 'CONTACTS'

// ================================================
// DOC-014 §3 MODULE DEFINITIONS
// ================================================

const MODULES = [
  'projects',            // פרויקטים
  'hr',                  // כח אדם
  'events',              // יומן אירועים
  'equipment',           // ציוד
  'vehicles',            // רכבים
  'vendors',             // דירוג ספקים
  'contacts',            // אנשי קשר
  'knowledge_repository', // מאגר מידע
  'financial',           // פיננסי (placeholder)
  'admin',               // Admin Console
  'agent',               // WDI Agent
] as const

type Module = typeof MODULES[number]

// ================================================
// ACTION DEFINITIONS
// ================================================

const ACTIONS = ['read', 'update', 'create', 'delete', 'query'] as const
type Action = typeof ACTIONS[number]

// ================================================
// PERMISSION DEFINITION TYPE
// ================================================

interface PermissionGrant {
  module: Module
  action: Action
  scope: Scope
}

// ================================================
// DOC-014 §5 — FULL PERMISSION MATRIX BY ROLE
// ================================================

// Helper to create full access (ALL scope for all CRUD actions)
function fullAccess(module: Module): PermissionGrant[] {
  return [
    { module, action: 'read', scope: 'ALL' },
    { module, action: 'update', scope: 'ALL' },
    { module, action: 'create', scope: 'ALL' },
    { module, action: 'delete', scope: 'ALL' },
  ]
}

// Helper for read-only ALL access
function readOnly(module: Module): PermissionGrant[] {
  return [{ module, action: 'read', scope: 'ALL' }]
}

// ================================================
// §5.1 OWNER (בעלים) — Unrestricted
// ================================================

const OWNER_PERMISSIONS: PermissionGrant[] = [
  ...fullAccess('projects'),
  ...fullAccess('hr'),
  ...fullAccess('events'),
  ...fullAccess('equipment'),
  ...fullAccess('vehicles'),
  ...fullAccess('vendors'),
  ...fullAccess('contacts'),
  ...fullAccess('knowledge_repository'),
  ...fullAccess('financial'),
  ...fullAccess('admin'),  // FULL admin access per user requirement
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// §5.2 EXECUTIVE (מנכ״ל) — Full operational, no Admin modification
// ================================================

const EXECUTIVE_PERMISSIONS: PermissionGrant[] = [
  ...fullAccess('projects'),
  ...fullAccess('hr'),
  ...fullAccess('events'),
  ...fullAccess('equipment'),
  ...fullAccess('vehicles'),
  ...fullAccess('vendors'),
  ...fullAccess('contacts'),
  ...fullAccess('knowledge_repository'),
  ...fullAccess('financial'),
  // Admin: read only
  { module: 'admin', action: 'read', scope: 'ALL' },
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// §5.3 TRUST OFFICER (מנהל/ת משרד) — Administrative / HR / Operations
// ================================================

const TRUST_OFFICER_PERMISSIONS: PermissionGrant[] = [
  // Projects: read only
  { module: 'projects', action: 'read', scope: 'ALL' },
  // HR: full access
  ...fullAccess('hr'),
  // Events: full access
  ...fullAccess('events'),
  // Equipment: full access
  ...fullAccess('equipment'),
  // Vehicles: full access
  ...fullAccess('vehicles'),
  // Vendors: full access
  ...fullAccess('vendors'),
  // Contacts: full access
  ...fullAccess('contacts'),
  // Knowledge Repository: full access
  ...fullAccess('knowledge_repository'),
  // Financial: full access
  ...fullAccess('financial'),
  // Admin: read only
  { module: 'admin', action: 'read', scope: 'ALL' },
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// §5.4 PMO — Cross-project visibility, limited operations
// ================================================

const PMO_PERMISSIONS: PermissionGrant[] = [
  // Projects: read only
  { module: 'projects', action: 'read', scope: 'ALL' },
  // HR: MAIN_PAGE + SELF for read, SELF for update
  { module: 'hr', action: 'read', scope: 'MAIN_PAGE' },
  { module: 'hr', action: 'read', scope: 'SELF' },
  { module: 'hr', action: 'update', scope: 'SELF' },
  // Events: read only
  { module: 'events', action: 'read', scope: 'ALL' },
  // Equipment: OWN
  { module: 'equipment', action: 'read', scope: 'OWN' },
  { module: 'equipment', action: 'update', scope: 'OWN' },
  // Vehicles: OWN
  { module: 'vehicles', action: 'read', scope: 'OWN' },
  { module: 'vehicles', action: 'update', scope: 'OWN' },
  // Vendors: full access
  ...fullAccess('vendors'),
  // Contacts: full access
  ...fullAccess('contacts'),
  // Knowledge Repository: read only
  { module: 'knowledge_repository', action: 'read', scope: 'ALL' },
  // Financial: none
  // Admin: none
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// §5.5 FINANCE OFFICER (מנהל כספים) — Read-heavy + Financial control
// ================================================

const FINANCE_OFFICER_PERMISSIONS: PermissionGrant[] = [
  // All modules: read only (except financial)
  { module: 'projects', action: 'read', scope: 'ALL' },
  { module: 'hr', action: 'read', scope: 'ALL' },
  { module: 'events', action: 'read', scope: 'ALL' },
  { module: 'equipment', action: 'read', scope: 'ALL' },
  { module: 'vehicles', action: 'read', scope: 'ALL' },
  { module: 'vendors', action: 'read', scope: 'ALL' },
  { module: 'contacts', action: 'read', scope: 'ALL' },
  { module: 'knowledge_repository', action: 'read', scope: 'ALL' },
  // Financial: full access
  ...fullAccess('financial'),
  // Admin: none
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// §5.6 DOMAIN HEAD (ראש תחום) — Domain-scoped operations
// ================================================

const DOMAIN_HEAD_PERMISSIONS: PermissionGrant[] = [
  // Projects: read ALL, write DOMAIN
  { module: 'projects', action: 'read', scope: 'ALL' },
  { module: 'projects', action: 'update', scope: 'DOMAIN' },
  { module: 'projects', action: 'create', scope: 'DOMAIN' },
  { module: 'projects', action: 'delete', scope: 'DOMAIN' },
  // HR: MAIN_PAGE only
  { module: 'hr', action: 'read', scope: 'MAIN_PAGE' },
  // Events: read ALL, write DOMAIN
  { module: 'events', action: 'read', scope: 'ALL' },
  { module: 'events', action: 'update', scope: 'DOMAIN' },
  { module: 'events', action: 'create', scope: 'DOMAIN' },
  { module: 'events', action: 'delete', scope: 'DOMAIN' },
  // Equipment: read MAIN_PAGE, update OWN
  { module: 'equipment', action: 'read', scope: 'MAIN_PAGE' },
  { module: 'equipment', action: 'update', scope: 'OWN' },
  // Vehicles: read MAIN_PAGE, update OWN
  { module: 'vehicles', action: 'read', scope: 'MAIN_PAGE' },
  { module: 'vehicles', action: 'update', scope: 'OWN' },
  // Vendors: full access
  ...fullAccess('vendors'),
  // Contacts: full access
  ...fullAccess('contacts'),
  // Knowledge Repository: full access
  ...fullAccess('knowledge_repository'),
  // Financial: DOMAIN scope
  { module: 'financial', action: 'read', scope: 'DOMAIN' },
  { module: 'financial', action: 'update', scope: 'DOMAIN' },
  { module: 'financial', action: 'create', scope: 'DOMAIN' },
  { module: 'financial', action: 'delete', scope: 'DOMAIN' },
  // Admin: none
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// §5.7 PROJECT MANAGER (מנהל פרויקט) — Assigned projects
// ================================================

const PROJECT_MANAGER_PERMISSIONS: PermissionGrant[] = [
  // Projects: read ALL, update/create ASSIGNED, no delete
  { module: 'projects', action: 'read', scope: 'ALL' },
  { module: 'projects', action: 'update', scope: 'ASSIGNED' },
  { module: 'projects', action: 'create', scope: 'ASSIGNED' },
  // HR: MAIN_PAGE + SELF for read, SELF for update
  { module: 'hr', action: 'read', scope: 'MAIN_PAGE' },
  { module: 'hr', action: 'read', scope: 'SELF' },
  { module: 'hr', action: 'update', scope: 'SELF' },
  // Events: read ALL, update/create ASSIGNED, delete OWN
  { module: 'events', action: 'read', scope: 'ALL' },
  { module: 'events', action: 'update', scope: 'ASSIGNED' },
  { module: 'events', action: 'create', scope: 'ASSIGNED' },
  { module: 'events', action: 'delete', scope: 'OWN' },
  // Equipment: OWN
  { module: 'equipment', action: 'read', scope: 'OWN' },
  { module: 'equipment', action: 'update', scope: 'OWN' },
  // Vehicles: OWN
  { module: 'vehicles', action: 'read', scope: 'OWN' },
  { module: 'vehicles', action: 'update', scope: 'OWN' },
  // Vendors: full access
  ...fullAccess('vendors'),
  // Contacts: full access
  ...fullAccess('contacts'),
  // Knowledge Repository: read only
  { module: 'knowledge_repository', action: 'read', scope: 'ALL' },
  // Financial: none
  // Admin: none
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// §5.8 PROJECT COORDINATOR (מתאם פרויקט) — Assigned projects, limited scope
// ================================================

const PROJECT_COORDINATOR_PERMISSIONS: PermissionGrant[] = [
  // Projects: read ALL, update ASSIGNED, no create/delete
  { module: 'projects', action: 'read', scope: 'ALL' },
  { module: 'projects', action: 'update', scope: 'ASSIGNED' },
  // HR: MAIN_PAGE + SELF for read, SELF for update
  { module: 'hr', action: 'read', scope: 'MAIN_PAGE' },
  { module: 'hr', action: 'read', scope: 'SELF' },
  { module: 'hr', action: 'update', scope: 'SELF' },
  // Events: read ASSIGNED, update OWN, create ASSIGNED, delete OWN
  { module: 'events', action: 'read', scope: 'ASSIGNED' },
  { module: 'events', action: 'update', scope: 'OWN' },
  { module: 'events', action: 'create', scope: 'ASSIGNED' },
  { module: 'events', action: 'delete', scope: 'OWN' },
  // Equipment: OWN
  { module: 'equipment', action: 'read', scope: 'OWN' },
  { module: 'equipment', action: 'update', scope: 'OWN' },
  // Vehicles: OWN
  { module: 'vehicles', action: 'read', scope: 'OWN' },
  { module: 'vehicles', action: 'update', scope: 'OWN' },
  // Vendors: full access
  ...fullAccess('vendors'),
  // Contacts: full access
  ...fullAccess('contacts'),
  // Knowledge Repository: read only
  { module: 'knowledge_repository', action: 'read', scope: 'ALL' },
  // Financial: none
  // Admin: none
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// §5.9 ADMINISTRATION (אדמיניסטרציה) — Equipment, vehicles, vendors, contacts
// ================================================

const ADMINISTRATION_PERMISSIONS: PermissionGrant[] = [
  // Projects: read ALL, write CONTACTS only
  { module: 'projects', action: 'read', scope: 'ALL' },
  { module: 'projects', action: 'update', scope: 'CONTACTS' },
  { module: 'projects', action: 'create', scope: 'CONTACTS' },
  { module: 'projects', action: 'delete', scope: 'CONTACTS' },
  // HR: read CONTACTS only
  { module: 'hr', action: 'read', scope: 'CONTACTS' },
  // Events: none
  // Equipment: full access
  ...fullAccess('equipment'),
  // Vehicles: full access
  ...fullAccess('vehicles'),
  // Vendors: read/update/create ALL, no delete
  { module: 'vendors', action: 'read', scope: 'ALL' },
  { module: 'vendors', action: 'update', scope: 'ALL' },
  { module: 'vendors', action: 'create', scope: 'ALL' },
  // Contacts: full access
  ...fullAccess('contacts'),
  // Knowledge Repository: read only
  { module: 'knowledge_repository', action: 'read', scope: 'ALL' },
  // Financial: none
  // Admin: none
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// §5.10 ALL EMPLOYEES (כל העובדים) — Minimal (temporary role)
// ================================================

const ALL_EMPLOYEES_PERMISSIONS: PermissionGrant[] = [
  // Projects: none
  // HR: SELF only
  { module: 'hr', action: 'read', scope: 'SELF' },
  { module: 'hr', action: 'update', scope: 'SELF' },
  // Events: none
  // Equipment: OWN
  { module: 'equipment', action: 'read', scope: 'OWN' },
  { module: 'equipment', action: 'update', scope: 'OWN' },
  // Vehicles: OWN
  { module: 'vehicles', action: 'read', scope: 'OWN' },
  { module: 'vehicles', action: 'update', scope: 'OWN' },
  // Vendors: none
  // Contacts: none
  // Knowledge Repository: none
  // Financial: none
  // Admin: none
  { module: 'agent', action: 'query', scope: 'ALL' },
]

// ================================================
// ROLE → PERMISSIONS MAPPING
// ================================================

const ROLE_PERMISSIONS: Record<string, PermissionGrant[]> = {
  'owner': OWNER_PERMISSIONS,
  'executive': EXECUTIVE_PERMISSIONS,
  'trust_officer': TRUST_OFFICER_PERMISSIONS,
  'pmo': PMO_PERMISSIONS,
  'finance_officer': FINANCE_OFFICER_PERMISSIONS,
  'domain_head': DOMAIN_HEAD_PERMISSIONS,
  'project_manager': PROJECT_MANAGER_PERMISSIONS,
  'project_coordinator': PROJECT_COORDINATOR_PERMISSIONS,
  'administration': ADMINISTRATION_PERMISSIONS,
  'all_employees': ALL_EMPLOYEES_PERMISSIONS,
}

// ================================================
// SEED FUNCTION
// ================================================

async function seedPermissions(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  RBAC v2 PHASE 2 — PERMISSION SEED')
  console.log('  Implements: DOC-013 §5 + DOC-014 §5')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  // Step 1: Clear existing role-permission mappings
  console.log('🗑️  Step 1: Clearing existing RolePermission mappings...')
  const deletedMappings = await prisma.rolePermission.deleteMany()
  console.log(`   Deleted ${deletedMappings.count} existing mappings`)

  // Step 2: Clear existing permissions
  console.log('')
  console.log('🗑️  Step 2: Clearing existing Permission records...')
  const deletedPermissions = await prisma.permission.deleteMany()
  console.log(`   Deleted ${deletedPermissions.count} existing permissions`)

  // Step 3: Collect all unique permissions needed
  console.log('')
  console.log('📋 Step 3: Building unique permission set...')
  const uniquePermissions = new Map<string, PermissionGrant>()

  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    for (const perm of permissions) {
      const key = `${perm.module}:${perm.action}:${perm.scope}`
      if (!uniquePermissions.has(key)) {
        uniquePermissions.set(key, perm)
      }
    }
  }
  console.log(`   Found ${uniquePermissions.size} unique permissions`)

  // Step 4: Create all permissions
  console.log('')
  console.log('🔐 Step 4: Creating permissions...')
  const permissionIdMap = new Map<string, string>()

  for (const [key, perm] of Array.from(uniquePermissions)) {
    const created = await prisma.permission.create({
      data: {
        module: perm.module,
        action: perm.action,
        scope: perm.scope,
        description: `${perm.action} ${perm.module} (${perm.scope})`,
      },
    })
    permissionIdMap.set(key, created.id)
  }
  console.log(`   Created ${permissionIdMap.size} permissions`)

  // Step 5: Get all roles
  console.log('')
  console.log('👥 Step 5: Fetching roles...')
  const roles = await prisma.role.findMany({
    select: { id: true, name: true },
  })
  const roleIdMap = new Map(roles.map(r => [r.name, r.id]))
  console.log(`   Found ${roles.length} roles`)

  // Step 6: Assign permissions to roles
  console.log('')
  console.log('🔗 Step 6: Assigning permissions to roles...')

  let totalAssignments = 0
  const roleStats: { role: string; count: number }[] = []

  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIdMap.get(roleName)
    if (!roleId) {
      console.log(`   ⚠️  Role not found: ${roleName}`)
      continue
    }

    let roleCount = 0
    for (const perm of permissions) {
      const permKey = `${perm.module}:${perm.action}:${perm.scope}`
      const permissionId = permissionIdMap.get(permKey)
      if (!permissionId) {
        console.log(`   ⚠️  Permission not found: ${permKey}`)
        continue
      }

      await prisma.rolePermission.create({
        data: { roleId, permissionId },
      })
      roleCount++
      totalAssignments++
    }

    roleStats.push({ role: roleName, count: roleCount })
    console.log(`   ✓ ${roleName}: ${roleCount} permissions`)
  }

  // Summary
  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  SEED SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')
  console.log(`   Total unique permissions: ${permissionIdMap.size}`)
  console.log(`   Total role assignments:   ${totalAssignments}`)
  console.log('')
  console.log('   Permissions per role:')
  for (const stat of roleStats) {
    console.log(`     ${stat.role.padEnd(20)} ${stat.count}`)
  }
  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
}

// ================================================
// VERIFICATION FUNCTION
// ================================================

async function verify(): Promise<boolean> {
  console.log('')
  console.log('🔍 VERIFICATION: Checking permission assignments...')
  console.log('')

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: { level: 'asc' },
  })

  console.log('Permission counts per role:')
  console.log('┌────────────────────────┬───────────┬──────────┐')
  console.log('│ Role                   │ Expected  │ Actual   │')
  console.log('├────────────────────────┼───────────┼──────────┤')

  let allMatch = true

  for (const role of roles) {
    const expected = ROLE_PERMISSIONS[role.name]?.length ?? 0
    const actual = role.permissions.length
    const status = expected === actual ? '✓' : '✗'
    if (expected !== actual) allMatch = false

    console.log(`│ ${role.name.padEnd(22)} │ ${String(expected).padStart(9)} │ ${String(actual).padStart(8)} │ ${status}`)
  }

  console.log('└────────────────────────┴───────────┴──────────┘')

  // Check total unique permissions
  const totalPerms = await prisma.permission.count()
  const expectedUniquePerms = new Set<string>()
  for (const perms of Object.values(ROLE_PERMISSIONS)) {
    for (const p of perms) {
      expectedUniquePerms.add(`${p.module}:${p.action}:${p.scope}`)
    }
  }

  console.log('')
  console.log(`Total unique permissions: ${totalPerms} (expected: ${expectedUniquePerms.size})`)

  if (totalPerms !== expectedUniquePerms.size) {
    allMatch = false
  }

  console.log('')
  if (allMatch) {
    console.log('✅ VERIFICATION PASSED: All permissions match DOC-014')
  } else {
    console.log('❌ VERIFICATION FAILED: Permissions do not match')
  }

  return allMatch
}

// ================================================
// DETAILED REPORT FUNCTION
// ================================================

async function detailedReport(): Promise<void> {
  console.log('')
  console.log('📊 DETAILED PERMISSION REPORT')
  console.log('')

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: { level: 'asc' },
  })

  for (const role of roles) {
    console.log(`\n═══ ${role.name.toUpperCase()} (${role.displayName}) ═══`)

    // Group by module
    const byModule = new Map<string, string[]>()
    for (const rp of role.permissions) {
      const p = rp.permission
      const key = p.module
      if (!byModule.has(key)) {
        byModule.set(key, [])
      }
      byModule.get(key)!.push(`${p.action}:${p.scope}`)
    }

    for (const [module, actions] of Array.from(byModule).sort()) {
      console.log(`  ${module}: ${actions.sort().join(', ')}`)
    }
  }
}

// ================================================
// MAIN
// ================================================

async function main() {
  const args = process.argv.slice(2)
  const isVerifyOnly = args.includes('--verify')
  const isReport = args.includes('--report')

  try {
    if (isVerifyOnly) {
      await verify()
    } else if (isReport) {
      await detailedReport()
    } else {
      await seedPermissions()
      await verify()
    }
  } catch (error) {
    console.error('')
    console.error('❌ Operation failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
