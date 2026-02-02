// ================================================
// WDI ERP - Admin Roles API
// Version: 20260202-RBAC-V2-PHASE3
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// ================================================

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { versionedResponse } from '@/lib/api-contracts'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v2 / DOC-016 §6.1: Operation-specific permission check
    const denied = await requirePermission(session, 'admin', 'read')
    if (denied) return denied

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
