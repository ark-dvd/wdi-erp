// ================================================
// WDI ERP - RBAC v1 Canonical Seed
// Version: 20260125-RBAC-V1
// Implements: DOC-013 RBAC Authorization Matrix v1.1
// Implements: DOC-014 RBAC Authorization Matrix v1.0
// ================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ================================================
// CANONICAL ROLES (DOC-013 §4.1)
// ================================================

const CANONICAL_ROLES = [
  { name: 'owner', displayName: 'בעלים', description: 'גישה מלאה לכל המערכת', level: 1 },
  { name: 'executive', displayName: 'מנכ"ל', description: 'הנהלה בכירה עם גישה תפעולית מלאה', level: 2 },
  { name: 'trust_officer', displayName: 'מנהל משרד', description: 'מנהל משרד / רכז משאבי אנוש', level: 3 },
  { name: 'finance_officer', displayName: 'מנהל כספים', description: 'פיקוח פיננסי', level: 3 },
  { name: 'domain_head', displayName: 'ראש תחום', description: 'מנהל תחום פעילות', level: 4 },
  { name: 'senior_pm', displayName: 'מנהל פרויקט בכיר', description: 'ניהול פרויקטים בכיר', level: 5 },
  { name: 'project_coordinator', displayName: 'רכז פרויקט', description: 'רכז פרויקט', level: 6 },
  { name: 'operations_staff', displayName: 'צוות תפעול', description: 'עובד תפעול', level: 7 },
  { name: 'all_employees', displayName: 'כל העובדים', description: 'תפקיד בסיס לכל עובד מאומת', level: 100 },
] as const

// ================================================
// CANONICAL SCOPES (DOC-013 §5.1)
// ================================================

type Scope = 'ALL' | 'DOMAIN' | 'PROJECT' | 'OWN' | 'SELF'

// ================================================
// CANONICAL MODULES (DOC-013 §6.1)
// ================================================

const CANONICAL_MODULES = [
  'org_directory',  // ספר הארגון
  'hr',             // משאבי אנוש
  'projects',       // פרויקטים
  'events',         // אירועים
  'vendors',        // ספקים
  'vehicles',       // רכבים
  'equipment',      // ציוד
  'documents',      // מסמכים
  'admin',          // ניהול מערכת
  'agent',          // סוכן WDI
  'knowledge_repository', // מאגר המידע (placeholder)
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

// Build full permission matrix from DOC-014
const PERMISSION_MATRIX: PermissionGrant[] = [
  // === org_directory (§4.1) ===
  { module: 'org_directory', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'domain_head', 'senior_pm', 'project_coordinator', 'operations_staff', 'all_employees'] },
  { module: 'org_directory', action: 'CREATE', scope: 'ALL', roles: ['owner'] },
  { module: 'org_directory', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'org_directory', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'org_directory', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === hr (§4.2) ===
  { module: 'hr', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer'], notes: 'Full sensitive HR access' },
  { module: 'hr', action: 'READ', scope: 'ALL', roles: ['finance_officer'], notes: 'Compensation fields only' },
  { module: 'hr', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'], notes: 'HR Metadata only' },
  { module: 'hr', action: 'READ', scope: 'PROJECT', roles: ['senior_pm'], notes: 'HR Metadata only' },
  { module: 'hr', action: 'READ', scope: 'SELF', roles: ['project_coordinator', 'operations_staff', 'all_employees'], notes: 'Own record only' },
  { module: 'hr', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'hr', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'hr', action: 'DELETE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'hr', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === projects (§4.3) ===
  { module: 'projects', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer'] },
  { module: 'projects', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'projects', action: 'READ', scope: 'PROJECT', roles: ['senior_pm', 'project_coordinator', 'operations_staff', 'all_employees'] },
  { module: 'projects', action: 'CREATE', scope: 'ALL', roles: ['owner'] },
  { module: 'projects', action: 'CREATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'projects', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'executive'] },
  { module: 'projects', action: 'UPDATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'projects', action: 'UPDATE', scope: 'PROJECT', roles: ['senior_pm', 'project_coordinator'] },
  { module: 'projects', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'projects', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === events (§4.4) ===
  { module: 'events', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer'] },
  { module: 'events', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'events', action: 'READ', scope: 'PROJECT', roles: ['senior_pm', 'project_coordinator', 'operations_staff', 'all_employees'] },
  { module: 'events', action: 'CREATE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer'] },
  { module: 'events', action: 'CREATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'events', action: 'CREATE', scope: 'PROJECT', roles: ['senior_pm', 'project_coordinator', 'operations_staff', 'all_employees'], notes: 'Field-level operational logging' },
  { module: 'events', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'executive'] },
  { module: 'events', action: 'UPDATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'events', action: 'UPDATE', scope: 'PROJECT', roles: ['senior_pm', 'project_coordinator'] },
  { module: 'events', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'events', action: 'DELETE', scope: 'PROJECT', roles: ['senior_pm'] },
  { module: 'events', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === vendors (§4.5) ===
  { module: 'vendors', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'domain_head', 'senior_pm', 'project_coordinator', 'operations_staff', 'all_employees'] },
  { module: 'vendors', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'vendors', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer'] },
  { module: 'vendors', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'vendors', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === vehicles (§4.6) ===
  { module: 'vehicles', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'senior_pm', 'project_coordinator', 'operations_staff', 'all_employees'] },
  { module: 'vehicles', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'vehicles', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'vehicles', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'vehicles', action: 'UPDATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'vehicles', action: 'DELETE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'vehicles', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === equipment (§4.7) ===
  { module: 'equipment', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'senior_pm', 'project_coordinator', 'operations_staff', 'all_employees'] },
  { module: 'equipment', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'equipment', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'equipment', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'equipment', action: 'UPDATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'equipment', action: 'DELETE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'equipment', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === documents (§4.8) ===
  { module: 'documents', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer'] },
  { module: 'documents', action: 'READ', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'documents', action: 'READ', scope: 'PROJECT', roles: ['senior_pm', 'project_coordinator', 'operations_staff', 'all_employees'] },
  { module: 'documents', action: 'CREATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'documents', action: 'CREATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'documents', action: 'CREATE', scope: 'PROJECT', roles: ['senior_pm', 'project_coordinator'] },
  { module: 'documents', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'documents', action: 'UPDATE', scope: 'DOMAIN', roles: ['domain_head'] },
  { module: 'documents', action: 'UPDATE', scope: 'PROJECT', roles: ['senior_pm'] },
  { module: 'documents', action: 'DELETE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
  { module: 'documents', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === admin (§4.9) ===
  { module: 'admin', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer'] },
  { module: 'admin', action: 'CREATE', scope: 'ALL', roles: ['owner'] },
  { module: 'admin', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'trust_officer'], notes: 'Trust Officer cannot modify Owner or own permissions' },
  { module: 'admin', action: 'DELETE', scope: 'ALL', roles: ['owner'] },
  { module: 'admin', action: 'ADMIN', scope: 'ALL', roles: ['owner'] },

  // === agent (§4.10) ===
  { module: 'agent', action: 'QUERY', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'finance_officer', 'domain_head', 'senior_pm', 'project_coordinator', 'operations_staff', 'all_employees'] },

  // === knowledge_repository (§4.11) - Placeholder, no permissions yet ===
]

// ================================================
// LEGACY ROLE MAPPING (for migration)
// ================================================

const LEGACY_TO_CANONICAL_MAP: Record<string, string> = {
  'founder': 'owner',
  'ceo': 'executive',
  'office_manager': 'trust_officer',
  'department_manager': 'domain_head',
  'project_manager': 'senior_pm',
  'secretary': 'operations_staff',
  'employee': 'all_employees',
}

async function main() {
  console.log('🌱 Starting RBAC v1 canonical seed...')

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

  console.log('✅ RBAC v1 seed completed successfully!')
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
