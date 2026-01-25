import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import {
  parsePagination,
  calculateSkip,
  paginatedResponse,
  parseAndValidateSort,
  sortValidationError,
  toPrismaOrderBy,
  versionedResponse,
  validationError,
  SORT_DEFINITIONS,
} from '@/lib/api-contracts'
import { RBAC_ADMIN_ROLES, canModifyRbac, type CanonicalRole } from '@/lib/authorization'

// Version: 20260125-RBAC-V1
// RBAC v1: Role management per DOC-013 §10.2
// MAYBACH: R1-Pagination, R4-Sorting, R5-Versioning

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC v1: Check multi-role authorization (DOC-013 §10.2)
    const userRoles = (session.user as any)?.roles || []
    const userRoleNames: CanonicalRole[] = userRoles.map((r: { name: string }) => r.name)
    const canReadAdmin = userRoleNames.some(r => RBAC_ADMIN_ROLES.includes(r))

    if (!canReadAdmin) {
      return versionedResponse({ error: 'אין הרשאה לניהול משתמשים' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    // R1: Parse pagination
    const { page, limit } = parsePagination(searchParams)

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.users)
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error)
    }

    // R1: Count total for pagination
    const total = await prisma.user.count()

    // RBAC v1: Query users with multi-role support
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        lastLogin: true,
        isActive: true,
        // RBAC v1: Load all assigned roles
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                level: true,
              },
            },
          },
          orderBy: { role: { level: 'asc' } },
        },
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      // R4: Client-configurable sorting
      orderBy: toPrismaOrderBy(sortResult.sort),
      // R1: Apply pagination
      skip: calculateSkip(page, limit),
      take: limit,
    })

    // Transform to include primary role for backwards compatibility
    const transformedUsers = users.map((user) => ({
      ...user,
      role: user.roles[0]?.role || { name: 'all_employees', displayName: 'כל העובדים' },
      roles: user.roles.map((ur) => ur.role),
    }))

    // R1 + R5: Return paginated response with versioning
    return versionedResponse(paginatedResponse(transformedUsers, page, limit, total))
  } catch (error) {
    console.error('Error fetching users:', error)
    return versionedResponse({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// RBAC v1: Role assignment endpoint (DOC-013 §4.2)
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const actorUserId = (session.user as any)?.id
    const userRoles = (session.user as any)?.roles || []
    const userRoleNames: CanonicalRole[] = userRoles.map((r: { name: string }) => r.name)

    const data = await request.json()
    const { userId, roleIds, action } = data

    if (!userId || !action) {
      return validationError({ userId: 'מזהה משתמש חובה', action: 'פעולה חובה' })
    }

    // Validate action
    if (action !== 'assign' && action !== 'remove') {
      return validationError({ action: 'פעולה לא תקינה. ערכים: assign, remove' })
    }

    // Get target user's current roles
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    if (!targetUser) {
      return versionedResponse({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    // Get roles being modified
    const rolesToModify = await prisma.role.findMany({
      where: { id: { in: roleIds } },
    })

    // Check authorization for each role modification
    for (const role of rolesToModify) {
      const authCheck = canModifyRbac(
        userRoleNames,
        role.name,
        userId,
        actorUserId
      )

      if (!authCheck.allowed) {
        let errorMsg = 'אין הרשאה לשנות תפקידים'
        if (authCheck.reason === 'CANNOT_MODIFY_OWNER') {
          errorMsg = 'אין הרשאה לשנות הרשאות בעלים'
        } else if (authCheck.reason === 'CANNOT_MODIFY_SELF') {
          errorMsg = 'אין הרשאה לשנות את ההרשאות שלך'
        }
        return versionedResponse({ error: errorMsg }, { status: 403 })
      }
    }

    // Perform the role modification
    const previousRoles = targetUser.roles.map((ur) => ur.role.name)

    if (action === 'assign') {
      // Add roles
      for (const roleId of roleIds) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId, roleId } },
          update: {},
          create: { userId, roleId, createdBy: actorUserId },
        })
      }
    } else {
      // Remove roles (but never remove all_employees)
      const allEmployeesRole = await prisma.role.findUnique({
        where: { name: 'all_employees' },
      })

      const roleIdsToRemove = roleIds.filter(
        (id: string) => id !== allEmployeesRole?.id
      )

      await prisma.userRole.deleteMany({
        where: {
          userId,
          roleId: { in: roleIdsToRemove },
        },
      })
    }

    // Fetch updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
          orderBy: { role: { level: 'asc' } },
        },
      },
    })

    const newRoles = updatedUser?.roles.map((ur) => ur.role.name) || []

    // Audit log (DOC-013 R-005)
    await logCrud(
      'UPDATE',
      'admin',
      'user_role',
      userId,
      targetUser.email,
      {
        action,
        previousRoles,
        newRoles,
        modifiedRoles: rolesToModify.map((r) => r.name),
      }
    )

    return versionedResponse({
      success: true,
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        roles: updatedUser?.roles.map((ur) => ur.role),
      },
    })
  } catch (error) {
    console.error('Error updating user roles:', error)
    return versionedResponse({ error: 'Failed to update user roles' }, { status: 500 })
  }
}
