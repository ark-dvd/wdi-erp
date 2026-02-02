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
import { RBAC_ADMIN_ROLES, canModifyRbac, checkAdminAccess, type CanonicalRole } from '@/lib/authorization'

// Version: 20260125-RBAC-V1
// RBAC v1: Role management per DOC-013 §10.2
// MAYBACH: R1-Pagination, R4-Sorting, R5-Versioning

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v1: Check multi-role authorization (DOC-013 §10.2)
    if (!checkAdminAccess(session)) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 403 })
    }

    const userRoles = (session.user as any)?.roles || []
    const userRoleNames: CanonicalRole[] = userRoles.map((r: { name: string }) => r.name)

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

// RBAC v2 / INV-007: Single role assignment endpoint (DOC-016 v2.0)
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
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

    // RBAC v2 / INV-007: Single role enforcement
    // 'remove' action is blocked - cannot remove user's only role
    if (action === 'remove') {
      return versionedResponse(
        { error: 'לא ניתן להסיר תפקיד. השתמש בשינוי תפקיד במקום.' },
        { status: 400 }
      )
    }

    // 'assign' action: REPLACE user's role (single role only)
    // If multiple roleIds provided, use only the first one
    if (!roleIds || roleIds.length === 0) {
      return validationError({ roleIds: 'יש לציין תפקיד אחד לפחות' })
    }
    const roleId = roleIds[0]  // INV-007: Take only the first role

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

    // Get role being assigned
    const roleToAssign = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!roleToAssign) {
      return versionedResponse({ error: 'תפקיד לא נמצא' }, { status: 404 })
    }

    // Check authorization for role modification
    const authCheck = canModifyRbac(
      userRoleNames,
      roleToAssign.name,
      userId,
      actorUserId
    )

    if (!authCheck.allowed) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 403 })
    }

    // Perform the role REPLACEMENT (not addition)
    const previousRoles = targetUser.roles.map((ur) => ur.role.name)
    const existingAssignment = targetUser.roles[0]

    // Check if user already has this exact role
    if (existingAssignment?.roleId === roleId) {
      return versionedResponse(
        { error: 'המשתמש כבר משויך לתפקיד זה' },
        { status: 400 }
      )
    }

    // Use transaction to atomically replace the role
    await prisma.$transaction(async (tx) => {
      // Delete existing role assignment (if any)
      if (existingAssignment) {
        await tx.userRole.delete({
          where: { id: existingAssignment.id },
        })
      }

      // Create new role assignment
      await tx.userRole.create({
        data: {
          userId,
          roleId,
          createdBy: actorUserId,
        },
      })
    })

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

    // Audit log (DOC-016 R-005)
    await logCrud(
      'UPDATE',
      'admin',
      'user_role',
      userId,
      targetUser.email,
      {
        action: 'replace',
        previousRoles,
        newRoles,
        roleAssigned: roleToAssign.name,
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
