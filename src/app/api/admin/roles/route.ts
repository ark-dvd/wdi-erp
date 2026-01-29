// ================================================
// WDI ERP - Admin Roles API
// Version: 20260125-RBAC-V1
// RBAC v1: Role management per DOC-013 §4
// ================================================

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { versionedResponse } from '@/lib/api-contracts'
import { checkAdminAccess } from '@/lib/authorization'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v1: Check admin authorization (with fallback) - DOC-013 §10.2
    if (!checkAdminAccess(session)) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 403 })
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
