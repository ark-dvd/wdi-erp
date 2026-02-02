// ================================================
// WDI ERP - RBAC v2 Canonical Seed (SAFE VERSION)
// Version: 20260202-RBAC-V2-PHASE2
// Implements: DOC-016 v2.0, INV-007 (Single Role Enforcement)
// Implements: DOC-014 RBAC Authorization Matrix v2.0
//
// SAFETY FEATURES:
// - Single role per user (INV-007)
// - Uses transaction wrapper (rollback on failure)
// - Comprehensive logging before/after
// - Role rename mapping documented
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
// Maps old role names → canonical role names
// ================================================

const LEGACY_TO_CANONICAL_MAP: Record<string, string> = {
  // === Exact matches (no change needed) ===
  'owner': 'owner',
  'executive': 'executive',
  'trust_officer': 'trust_officer',
  'pmo': 'pmo',
  'finance_officer': 'finance_officer',
  'domain_head': 'domain_head',
  'project_manager': 'project_manager',
  'project_coordinator': 'project_coordinator',
  'administration': 'administration',
  'all_employees': 'all_employees',

  // === Legacy v1 names → Canonical v2 names ===
  'founder': 'owner',
  'ceo': 'executive',
  'office_manager': 'trust_officer',
  'department_manager': 'domain_head',
  'senior_pm': 'project_manager',
  'operations_staff': 'administration',
  'secretary': 'administration',
  'employee': 'all_employees',

  // === Additional legacy mappings (add as needed) ===
  'admin': 'owner',  // Legacy admin role → owner
  'manager': 'project_manager',  // Generic manager → project_manager
}

// ================================================
// TYPES FOR BACKUP
// ================================================

interface UserRoleBackup {
  userId: string
  userEmail: string
  roleId: string
  roleName: string
  createdAt: Date
}

interface RoleCount {
  roleName: string
  count: number
  users: string[]
}

// ================================================
// MAIN SAFE SEED FUNCTION
// ================================================

async function main() {
  console.log('='.repeat(60))
  console.log('🌱 SAFE RBAC v2 Canonical Seed')
  console.log('   Version: 20260128-RBAC-V2-SAFE')
  console.log('   Transaction-wrapped with rollback on failure')
  console.log('='.repeat(60))
  console.log('')

  // ================================================
  // STEP 0: BACKUP - Capture current state BEFORE transaction
  // ================================================
  console.log('📸 STEP 0: Capturing current UserRole state (BACKUP)...')

  const currentUserRoles = await prisma.userRole.findMany({
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { id: true, name: true } },
    },
  })

  const userRoleBackup: UserRoleBackup[] = currentUserRoles.map(ur => ({
    userId: ur.user.id,
    userEmail: ur.user.email || 'NO_EMAIL',
    roleId: ur.role.id,
    roleName: ur.role.name,
    createdAt: ur.createdAt,
  }))

  // Build user → roles mapping for restoration
  const userRolesMap: Map<string, { email: string; roles: string[] }> = new Map()
  for (const backup of userRoleBackup) {
    if (!userRolesMap.has(backup.userId)) {
      userRolesMap.set(backup.userId, { email: backup.userEmail, roles: [] })
    }
    userRolesMap.get(backup.userId)!.roles.push(backup.roleName)
  }

  // Count users per role BEFORE
  const roleCountsBefore: RoleCount[] = []
  const roleToUsersBefore: Map<string, string[]> = new Map()
  for (const backup of userRoleBackup) {
    if (!roleToUsersBefore.has(backup.roleName)) {
      roleToUsersBefore.set(backup.roleName, [])
    }
    roleToUsersBefore.get(backup.roleName)!.push(backup.userEmail)
  }
  for (const [roleName, users] of Array.from(roleToUsersBefore.entries())) {
    roleCountsBefore.push({ roleName, count: users.length, users })
  }

  console.log('')
  console.log('📊 CURRENT STATE (BEFORE CHANGES):')
  console.log('-'.repeat(50))
  console.log(`   Total UserRole assignments: ${userRoleBackup.length}`)
  console.log(`   Total unique users with roles: ${userRolesMap.size}`)
  console.log('')
  console.log('   Users per role:')
  for (const rc of roleCountsBefore.sort((a, b) => b.count - a.count)) {
    console.log(`   - ${rc.roleName}: ${rc.count} users`)
    for (const email of rc.users) {
      console.log(`     • ${email}`)
    }
  }
  console.log('')

  // Log full backup for manual recovery
  console.log('📋 FULL BACKUP (for manual recovery if needed):')
  console.log('-'.repeat(50))
  console.log('BEGIN_BACKUP_JSON')
  console.log(JSON.stringify(userRoleBackup, null, 2))
  console.log('END_BACKUP_JSON')
  console.log('')

  // ================================================
  // EXECUTE IN TRANSACTION (rollback on any failure)
  // ================================================
  console.log('🔄 Starting transaction (will rollback on any failure)...')
  console.log('')

  try {
    await prisma.$transaction(async (tx) => {
      // ================================================
      // STEP 1: Clear RBAC data (inside transaction)
      // ================================================
      console.log('🗑️  STEP 1: Clearing existing RBAC data...')
      await tx.rolePermission.deleteMany()
      console.log('   ✓ Deleted all RolePermission entries')
      await tx.permission.deleteMany()
      console.log('   ✓ Deleted all Permission entries')
      await tx.userRole.deleteMany()
      console.log('   ✓ Deleted all UserRole entries')
      await tx.role.deleteMany()
      console.log('   ✓ Deleted all Role entries')
      await tx.allowedDomain.deleteMany()
      console.log('   ✓ Deleted all AllowedDomain entries')
      console.log('')

      // ================================================
      // STEP 2: Create allowed domains
      // ================================================
      console.log('📧 STEP 2: Creating allowed domains...')
      await tx.allowedDomain.createMany({
        data: [
          { domain: 'wdi.one', isActive: true },
          { domain: 'wdiglobal.com', isActive: true },
        ],
      })
      console.log('   ✓ Created: wdi.one, wdiglobal.com')
      console.log('')

      // ================================================
      // STEP 3: Create canonical roles
      // ================================================
      console.log('👥 STEP 3: Creating canonical roles (DOC-013 §4.1)...')
      const newRoleMap: Record<string, string> = {}
      for (const role of CANONICAL_ROLES) {
        const created = await tx.role.create({ data: role })
        newRoleMap[role.name] = created.id
        console.log(`   ✓ ${role.displayName} (${role.name}) → ${created.id}`)
      }
      console.log('')

      // ================================================
      // STEP 4: Create permissions
      // ================================================
      console.log('🔐 STEP 4: Creating permissions with scope (DOC-013 §5)...')
      const permissionMap: Map<string, string> = new Map()

      const uniquePermissions = new Set<string>()
      for (const grant of PERMISSION_MATRIX) {
        const key = `${grant.module}:${grant.action}:${grant.scope}`
        uniquePermissions.add(key)
      }

      for (const permKey of Array.from(uniquePermissions)) {
        const [module, action, scope] = permKey.split(':')
        const created = await tx.permission.create({
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
      console.log('')

      // ================================================
      // STEP 5: Assign permissions to roles
      // ================================================
      console.log('🔗 STEP 5: Assigning permissions to roles (DOC-014 matrix)...')
      let assignmentCount = 0
      for (const grant of PERMISSION_MATRIX) {
        const permKey = `${grant.module}:${grant.action}:${grant.scope}`
        const permId = permissionMap.get(permKey)
        if (!permId) continue

        for (const roleName of grant.roles) {
          const roleId = newRoleMap[roleName]
          if (!roleId) continue

          await tx.rolePermission.create({
            data: { roleId, permissionId: permId },
          })
          assignmentCount++
        }
      }
      console.log(`   ✓ Created ${assignmentCount} role-permission assignments`)
      console.log('')

      // ================================================
      // STEP 6: RESTORE USER ROLE ASSIGNMENTS
      // RBAC v2 / INV-007: Single role per user
      // ================================================
      console.log('👤 STEP 6: Restoring user role assignments (single role per user)...')
      console.log('')

      // Role level for priority selection (lower = higher privilege)
      const ROLE_LEVEL: Record<string, number> = {
        'owner': 1,
        'executive': 2,
        'trust_officer': 3,
        'finance_officer': 3,
        'pmo': 4,
        'domain_head': 4,
        'project_manager': 5,
        'project_coordinator': 6,
        'administration': 7,
        'all_employees': 100,
      }

      const unmappedUsers: { email: string; oldRoles: string[] }[] = []
      const restoredUsers: { email: string; oldRoles: string[]; newRole: string }[] = []
      let totalRestored = 0

      for (const [userId, userData] of Array.from(userRolesMap.entries())) {
        const { email, roles: oldRoles } = userData
        const failedMappings: string[] = []

        // Map old roles to canonical names and find valid ones
        const validRoles: { name: string; roleId: string; level: number }[] = []
        for (const oldRole of oldRoles) {
          const canonicalName = LEGACY_TO_CANONICAL_MAP[oldRole] || oldRole
          const newRoleId = newRoleMap[canonicalName]

          if (newRoleId) {
            validRoles.push({
              name: canonicalName,
              roleId: newRoleId,
              level: ROLE_LEVEL[canonicalName] || 100,
            })
          } else {
            failedMappings.push(oldRole)
          }
        }

        // INV-007: Pick ONE role - highest privilege (lowest level number)
        // If no valid roles, default to all_employees
        let selectedRole: { name: string; roleId: string }
        if (validRoles.length > 0) {
          validRoles.sort((a, b) => a.level - b.level)
          selectedRole = { name: validRoles[0].name, roleId: validRoles[0].roleId }
        } else {
          const allEmployeesId = newRoleMap['all_employees']
          if (!allEmployeesId) {
            console.error(`   ✗ ${email}: No valid roles and all_employees not found!`)
            continue
          }
          selectedRole = { name: 'all_employees', roleId: allEmployeesId }
        }

        // Create single UserRole assignment (upsert by userId)
        await tx.userRole.upsert({
          where: { userId },
          update: { roleId: selectedRole.roleId },
          create: { userId, roleId: selectedRole.roleId },
        })
        totalRestored++

        if (failedMappings.length > 0) {
          unmappedUsers.push({ email, oldRoles: failedMappings })
        }

        restoredUsers.push({ email, oldRoles, newRole: selectedRole.name })
        console.log(`   ✓ ${email}: [${oldRoles.join(', ')}] → ${selectedRole.name}`)
      }

      console.log('')
      console.log(`   Total UserRole assignments restored: ${totalRestored}`)
      console.log('')

      // ================================================
      // STEP 7: Ensure Arik exists as Owner
      // RBAC v2 / INV-007: Single role only (owner)
      // ================================================
      console.log('👤 STEP 7: Ensuring Arik Davidi (arik@wdi.one) is Owner...')
      const ownerRoleId = newRoleMap['owner']

      if (ownerRoleId) {
        const arikUser = await tx.user.upsert({
          where: { email: 'arik@wdi.one' },
          update: { name: 'אריק דוידי', isActive: true },
          create: { email: 'arik@wdi.one', name: 'אריק דוידי', isActive: true },
        })

        // INV-007: Single role - upsert by userId only
        await tx.userRole.upsert({
          where: { userId: arikUser.id },
          update: { roleId: ownerRoleId },
          create: { userId: arikUser.id, roleId: ownerRoleId },
        })

        console.log('   ✓ Arik Davidi is Owner with full access')
      }
      console.log('')

      // ================================================
      // STEP 8: Report unmapped users (if any)
      // ================================================
      if (unmappedUsers.length > 0) {
        console.log('⚠️  WARNING: Some role mappings failed:')
        console.log('-'.repeat(50))
        for (const { email, oldRoles } of unmappedUsers) {
          console.log(`   ⚠️  ${email}: Could not map roles: [${oldRoles.join(', ')}]`)
        }
        console.log('')
        console.log('   These users still have all_employees role.')
        console.log('   You may need to manually assign elevated roles.')
        console.log('')
      }

      // Transaction will auto-commit if we reach here
      console.log('✅ Transaction completed successfully!')
    }, {
      timeout: 60000, // 60 second timeout for transaction
    })

    // ================================================
    // POST-TRANSACTION: Verify and report
    // ================================================
    console.log('')
    console.log('='.repeat(60))
    console.log('📊 POST-SEED VERIFICATION')
    console.log('='.repeat(60))

    const finalUserRoles = await prisma.userRole.findMany({
      include: {
        user: { select: { email: true } },
        role: { select: { name: true } },
      },
    })

    const roleCountsAfter: Map<string, string[]> = new Map()
    for (const ur of finalUserRoles) {
      const roleName = ur.role.name
      if (!roleCountsAfter.has(roleName)) {
        roleCountsAfter.set(roleName, [])
      }
      roleCountsAfter.get(roleName)!.push(ur.user.email || 'NO_EMAIL')
    }

    console.log('')
    console.log('Users per role AFTER seed:')
    for (const [roleName, users] of Array.from(roleCountsAfter.entries()).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`   - ${roleName}: ${users.length} users`)
      for (const email of users) {
        console.log(`     • ${email}`)
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('✅ SAFE RBAC v2 seed completed successfully!')
    console.log('='.repeat(60))
    console.log('')
    console.log('📊 Summary:')
    console.log(`   Roles created: ${CANONICAL_ROLES.length}`)
    console.log(`   Permissions created: ${Array.from(new Set(PERMISSION_MATRIX.map(p => `${p.module}:${p.action}:${p.scope}`))).length}`)
    console.log(`   UserRole assignments: ${finalUserRoles.length}`)

  } catch (error) {
    console.log('')
    console.log('='.repeat(60))
    console.log('❌ TRANSACTION ROLLED BACK - NO CHANGES MADE')
    console.log('='.repeat(60))
    console.log('')
    console.log('Error details:')
    console.error(error)
    console.log('')
    console.log('The database is unchanged. You can safely retry.')
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
