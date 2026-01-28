// ================================================
// WDI ERP - RBAC v2 Canonical Seed
// Version: 20260126-RBAC-V2
// Implements: DOC-013 RBAC Authorization Matrix v2.0
// Implements: DOC-014 RBAC Authorization Matrix v2.0
// ================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ================================================
// CANONICAL ROLES (DOC-013 §4.1)
// ================================================

const CANONICAL_ROLES = [
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
] as const

// ================================================
// CANONICAL SCOPES (DOC-013 §5.1)
// ================================================

type Scope = 'ALL' | 'DOMAIN' | 'ASSIGNED' | 'OWN' | 'SELF' | 'MAIN_PAGE'

// ================================================
// CANONICAL MODULES (DOC-013 §6.1)
// ================================================

const CANONICAL_MODULES = [
  'events',               // אירועים
  'projects',             // פרויקטים
  'hr',                   // משאבי אנוש
  'contacts',             // אנשי קשר וארגונים
  'vendors',              // ספקים
  'vehicles',             // רכבים
  'equipment',            // ציוד
  'knowledge_repository', // מאגר המידע
  'financial',            // כספים
  'agent',                // סוכן WDI
  'admin',                // ניהול מערכת
] as const

type Module = typeof CANONICAL_MODULES[number]

// ================================================
// CANONICAL OPERATIONS
// ================================================

const OPERATIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'ADMIN', 'QUERY'] as const
type Operation = typeof OPERATIONS[number]

// ================================================
// PERMISSION MATRIX (DOC-014 §3-4)
// ================================================

interface PermissionGrant {
  module: Module
  action: Operation
  scope: Scope
  roles: string[]
  notes?: string
}

// Build full permission matrix from DOC-014 - Canonical aligned
const PERMISSION_MATRIX: PermissionGrant[] = [
  // === contacts (§4.1) - Contacts and Organizations ===
  { module: 'contacts', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'domain_head', 'project_manager', 'project_coordinator', 'administration', 'all_employees'] },
  { module: 'contacts', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'contacts', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'contacts', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'contacts', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === hr (§4.2) ===
  { module: 'hr', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer'], notes: 'Full sensitive HR access' },
  { module: 'hr', action: 'READ', scope: 'ALL', roles: ['finance_officer'], notes: 'Compensation fields only' },
  { module: 'hr', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'], notes: 'HR Metadata only' },
  { module: 'hr', action: 'READ', scope: 'ASSIGNED', roles: ['project_manager'], notes: 'HR Metadata only' },
  { module: 'hr', action: 'READ', scope: 'SELF', roles: ['project_coordinator', 'administration', 'all_employees'], notes: 'Own record only' },
  { module: 'hr', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'hr', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'hr', action: 'DELETE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'hr', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === projects (§4.3) ===
  { module: 'projects', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'pmo'] },
  { module: 'projects', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'projects', action: 'READ', scope: 'ASSIGNED', roles: ['project_manager', 'project_coordinator', 'administration', 'all_employees'] },
  { module: 'projects', action: 'CREATE', scope: 'ALL', roles: ['owner', 'pmo'] },
  { module: 'projects', action: 'CREATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'projects', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'executive', 'pmo'] },
  { module: 'projects', action: 'UPDATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'projects', action: 'UPDATE', scope: 'ASSIGNED', roles: ['project_manager', 'project_coordinator'] },
  { module: 'projects', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'projects', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === events (§4.4) ===
  { module: 'events', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'pmo'] },
  { module: 'events', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'events', action: 'READ', scope: 'ASSIGNED', roles: ['project_manager', 'project_coordinator', 'administration', 'all_employees'] },
  { module: 'events', action: 'CREATE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'pmo'] },
  { module: 'events', action: 'CREATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'events', action: 'CREATE', scope: 'ASSIGNED', roles: ['project_manager', 'project_coordinator', 'administration', 'all_employees'], notes: 'Field-level operational logging' },
  { module: 'events', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'executive', 'pmo'] },
  { module: 'events', action: 'UPDATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'events', action: 'UPDATE', scope: 'ASSIGNED', roles: ['project_manager', 'project_coordinator'] },
  { module: 'events', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'events', action: 'DELETE', scope: 'ASSIGNED', roles: ['project_manager'] },
  { module: 'events', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === vendors (§4.5) ===
  { module: 'vendors', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'pmo', 'domain_head', 'project_manager', 'project_coordinator', 'administration', 'all_employees'] },
  { module: 'vendors', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'vendors', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer'] },
  { module: 'vendors', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'vendors', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === vehicles (§4.6) ===
  { module: 'vehicles', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'pmo', 'project_manager', 'project_coordinator', 'administration', 'all_employees'] },
  { module: 'vehicles', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'vehicles', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'vehicles', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'vehicles', action: 'UPDATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'vehicles', action: 'DELETE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'vehicles', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === equipment (§4.7) ===
  { module: 'equipment', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'pmo', 'project_manager', 'project_coordinator', 'administration', 'all_employees'] },
  { module: 'equipment', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'equipment', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'equipment', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'equipment', action: 'UPDATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'equipment', action: 'DELETE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'equipment', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === financial (§4.8) ===
  { module: 'financial', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'pmo'] },
  { module: 'financial', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'financial', action: 'READ', scope: 'ASSIGNED', roles: ['project_manager'] },
  { module: 'financial', action: 'CREATE', scope: 'ALL', roles: ['owner', 'finance_officer'] },
  { module: 'financial', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'finance_officer'] },
  { module: 'financial', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'financial', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === knowledge_repository (§4.9) ===
  { module: 'knowledge_repository', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'pmo', 'domain_head', 'project_manager', 'project_coordinator', 'administration', 'all_employees'] },
  { module: 'knowledge_repository', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'knowledge_repository', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'knowledge_repository', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'knowledge_repository', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === admin (§4.10) ===
  { module: 'admin', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer'] },
  { module: 'admin', action: 'CREATE', scope: 'ALL', roles: ['owner'] },
  { module: 'admin', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'], notes: 'Trust Officer cannot modify Owner or own permissions' },
  { module: 'admin', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'admin', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === agent (§4.11) ===
  { module: 'agent', action: 'QUERY', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'pmo', 'domain_head', 'project_manager', 'project_coordinator', 'administration', 'all_employees'] },
]

// ================================================
// LEGACY ROLE MAPPING (for migration)
// ================================================

const LEGACY_TO_CANONICAL_MAP: Record<string, string> = {
  // Legacy v1 names → Canonical v2 names
  'founder': 'owner',
  'ceo': 'executive',
  'office_manager': 'trust_officer',
  'department_manager': 'domain_head',
  'senior_pm': 'project_manager',        // v1→v2 rename
  'operations_staff': 'administration',  // v1→v2 rename
  'secretary': 'administration',
  'employee': 'all_employees',
}

async function main() {
  console.log('🌱 Starting RBAC v2 canonical seed...')

  // === STEP 1: Clear existing RBAC data ===
  console.log('🗑️  Clearing existing RBAC data...')
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.userRole.deleteMany()
  // Don't delete users - we need to migrate them
  await prisma.role.deleteMany()
  await prisma.allowedDomain.deleteMany()

  // === STEP 2: Create allowed domains ===
  console.log('📧 Creating allowed domains...')
  await prisma.allowedDomain.createMany({
    data: [
      { domain: 'wdi.one', isActive: true },
      { domain: 'wdiglobal.com', isActive: true },
    ],
  })

  // === STEP 2B: Create business domains (תחומים) ===
  console.log('🏢 Creating business domains...')
  await prisma.domain.deleteMany() // Clear existing
  const BUSINESS_DOMAINS = [
    { name: 'security', displayName: 'בטחוני', description: 'פרויקטים בטחוניים וצבאיים' },
    { name: 'commercial', displayName: 'מסחרי', description: 'פרויקטים מסחריים ועסקיים' },
    { name: 'industrial', displayName: 'תעשייתי', description: 'פרויקטים תעשייתיים' },
  ]
  for (const domain of BUSINESS_DOMAINS) {
    await prisma.domain.create({ data: domain })
    console.log(`   ✓ ${domain.displayName} (${domain.name})`)
  }

  // === STEP 3: Create canonical roles ===
  console.log('👥 Creating canonical roles (DOC-013 §4.1)...')
  const roleMap: Record<string, string> = {}
  for (const role of CANONICAL_ROLES) {
    const created = await prisma.role.create({ data: role })
    roleMap[role.name] = created.id
    console.log(`   ✓ ${role.displayName} (${role.name})`)
  }

  // === STEP 4: Create permissions with scope ===
  console.log('🔐 Creating permissions with scope (DOC-013 §5)...')
  const permissionMap: Map<string, string> = new Map()

  // Build unique permissions
  const uniquePermissions = new Set<string>()
  for (const grant of PERMISSION_MATRIX) {
    const key = `${grant.module}:${grant.action}:${grant.scope}`
    uniquePermissions.add(key)
  }

  for (const permKey of Array.from(uniquePermissions)) {
    const [module, action, scope] = permKey.split(':')
    const created = await prisma.permission.create({
      data: {
        module,
        action,
        scope,
        description: `${action} ${module} (${scope})`,
      },
    })
    permissionMap.set(permKey, created.id)
  }
  console.log(`   ✓ Created ${uniquePermissions.size} unique permissions`)

  // === STEP 5: Assign permissions to roles ===
  console.log('🔗 Assigning permissions to roles (DOC-014 matrix)...')
  let assignmentCount = 0
  for (const grant of PERMISSION_MATRIX) {
    const permKey = `${grant.module}:${grant.action}:${grant.scope}`
    const permId = permissionMap.get(permKey)
    if (!permId) continue

    for (const roleName of grant.roles) {
      const roleId = roleMap[roleName]
      if (!roleId) continue

      await prisma.rolePermission.create({
        data: { roleId, permissionId: permId },
      })
      assignmentCount++
    }
  }
  console.log(`   ✓ Created ${assignmentCount} role-permission assignments`)

  // === STEP 6: Migrate existing users to new role system ===
  console.log('👤 Migrating existing users to multi-role system...')
  const existingUsers = await prisma.user.findMany({
    select: { id: true, email: true, legacyRoleId: true },
  })

  // Get legacy roles for mapping
  // Note: Legacy roles no longer exist after deletion, so we'll use the map

  for (const user of existingUsers) {
    // Assign all_employees role to everyone (DOC-013 R-001)
    const allEmployeesRoleId = roleMap['all_employees']
    if (allEmployeesRoleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: allEmployeesRoleId } },
        update: {},
        create: { userId: user.id, roleId: allEmployeesRoleId },
      })
    }

    // Map legacy role to canonical role based on email for known users
    if (user.email === 'arik@wdi.one') {
      // Arik is Owner per requirement
      const ownerRoleId = roleMap['owner']
      if (ownerRoleId) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: ownerRoleId } },
          update: {},
          create: { userId: user.id, roleId: ownerRoleId },
        })
        console.log(`   ✓ ${user.email} → owner (בעלים)`)
      }
    }
  }

  // === STEP 7: Ensure Arik exists as Owner ===
  console.log('👤 Ensuring Arik Davidi (arik@wdi.one) is Owner...')
  const ownerRole = await prisma.role.findUnique({ where: { name: 'owner' } })
  const allEmployeesRole = await prisma.role.findUnique({ where: { name: 'all_employees' } })

  if (ownerRole && allEmployeesRole) {
    const arikUser = await prisma.user.upsert({
      where: { email: 'arik@wdi.one' },
      update: {
        name: 'אריק דוידי',
        isActive: true,
      },
      create: {
        email: 'arik@wdi.one',
        name: 'אריק דוידי',
        isActive: true,
      },
    })

    // Assign Owner role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: arikUser.id, roleId: ownerRole.id } },
      update: {},
      create: { userId: arikUser.id, roleId: ownerRole.id },
    })

    // Assign all_employees role (required for all users per DOC-013 R-001)
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: arikUser.id, roleId: allEmployeesRole.id } },
      update: {},
      create: { userId: arikUser.id, roleId: allEmployeesRole.id },
    })

    console.log('   ✓ Arik Davidi is Owner with full access')
  }

  console.log('✅ RBAC v2 seed completed successfully!')
  console.log('')
  console.log('📊 Summary:')
  console.log(`   Roles: ${CANONICAL_ROLES.length}`)
  console.log(`   Permissions: ${uniquePermissions.size}`)
  console.log(`   Assignments: ${assignmentCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
