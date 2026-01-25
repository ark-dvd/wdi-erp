// ================================================
// WDI ERP - Admin Roles API
// Version: 20260125-RBAC-V1
// RBAC v1: Role management per DOC-013 §4
// ================================================

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { versionedResponse } from '@/lib/api-contracts'
import { RBAC_ADMIN_ROLES, type CanonicalRole } from '@/lib/authorization'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC v1: Check multi-role authorization
    const userRoles = (session.user as any)?.roles || []
    const userRoleNames: CanonicalRole[] = userRoles.map((r: { name: string }) => r.name)
    const canReadAdmin = userRoleNames.some(r => RBAC_ADMIN_ROLES.includes(r))

    if (!canReadAdmin) {
      return versionedResponse({ error: 'אין הרשאה לצפות בתפקידים' }, { status: 403 })
    }

    // Get all roles ordered by level (privilege)
    const roles = await prisma.role.findMany({
      orderBy: { level: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        level: true,
        _count: {
          select: { userRoles: true },
        },
      },
    })

    // Transform to include user count
    const transformedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      level: role.level,
      userCount: role._count.userRoles,
    }))

    return versionedResponse({ roles: transformedRoles })
  } catch (error) {
    console.error('Error fetching roles:', error)
    return versionedResponse({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}
