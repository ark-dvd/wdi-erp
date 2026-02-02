// ================================================
// WDI ERP - Admin Role Detail API
// Version: 20260202-RBAC-V2-PHASE3
// Implements: GET /api/admin/roles/[name]
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// ================================================

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { versionedResponse } from '@/lib/api-contracts'
import { requirePermission } from '@/lib/permissions'

// ================================================
// CANONICAL MODULES (DOC-013)
// Must include all modules even if inactive
// ================================================

const CANONICAL_MODULES = [
  'events',
  'projects',
  'hr',
  'contacts',            // Aligned with seed-permissions-v2.ts
  'vendors',
  'equipment',
  'vehicles',
  'knowledge_repository',
  'financial',           // Aligned with seed-permissions-v2.ts (placeholder - inactive)
  'agent',
  'admin',
] as const

// ================================================
// GET /api/admin/roles/[name]
// Returns role definition with permissions and users
// ================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v2 / DOC-016 §6.1: Operation-specific permission check
    const denied = await requirePermission(session, 'admin', 'read')
    if (denied) return denied

    const { name: roleName } = await params

    // Fetch role with permissions and users
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                module: true,
                action: true,
                scope: true,
                description: true,
              },
            },
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
                employee: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!role) {
      return versionedResponse({ error: 'תפקיד לא נמצא' }, { status: 404 })
    }

    // Transform permissions to flat structure
    const permissions = role.permissions.map((rp) => ({
      id: rp.permission.id,
      module: rp.permission.module,
      action: rp.permission.action,
      scope: rp.permission.scope,
      description: rp.permission.description,
    }))

    // Group permissions by module for easier consumption
    const permissionsByModule: Record<
      string,
      { module: string; enabled: boolean; permissions: { action: string; scope: string }[] }
    > = {}

    // Initialize all canonical modules
    for (const module of CANONICAL_MODULES) {
      permissionsByModule[module] = {
        module,
        enabled: module !== 'financial', // Financial is inactive
        permissions: [],
      }
    }

    // Populate permissions from database
    for (const perm of permissions) {
      if (permissionsByModule[perm.module]) {
        permissionsByModule[perm.module].permissions.push({
          action: perm.action,
          scope: perm.scope,
        })
      }
    }

    // Transform users
    const users = role.userRoles.map((ur) => ({
      id: ur.user.id,
      email: ur.user.email,
      name: ur.user.name,
      isActive: ur.user.isActive,
      employee: ur.user.employee,
    }))

    // Build response
    const response = {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      level: role.level,
      permissions: permissions,
      permissionsByModule: Object.values(permissionsByModule),
      users: users,
      userCount: users.length,
      activeUserCount: users.filter((u) => u.isActive).length,
    }

    return versionedResponse(response)
  } catch (error) {
    console.error('Error fetching role detail:', error)
    return versionedResponse({ error: 'Failed to fetch role detail' }, { status: 500 })
  }
}
