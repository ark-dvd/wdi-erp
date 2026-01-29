// ================================================
// WDI ERP - Admin User Roles API
// Version: 20260125-RBAC-V1
// Implements: POST /api/admin/users/[id]/roles
// RBAC v1: Per DOC-013 §10.2
// ================================================

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { versionedResponse, validationError } from '@/lib/api-contracts'
import {
  RBAC_ADMIN_ROLES,
  canModifyRbac,
  checkAdminAccess,
  type CanonicalRole,
} from '@/lib/authorization'

// ================================================
// POST /api/admin/users/[id]/roles
// Assign role to user
// ================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    const actorUserId = (session.user as any)?.id
    const userRoles = (session.user as any)?.roles || []
    const userRoleNames: CanonicalRole[] = userRoles.map((r: { name: string }) => r.name)

    // RBAC v1: Check admin authorization (with fallback)
    if (!checkAdminAccess(session)) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 403 })
    }

    const { id: targetUserId } = await params
    const data = await request.json()
    const { roleId, domainId, domainIds } = data

    // Support both single domainId and multiple domainIds
    const domainsToAssign: string[] = domainIds || (domainId ? [domainId] : [])

    // Validate input
    if (!roleId) {
      return validationError({ roleId: 'מזהה תפקיד הוא שדה חובה' })
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    if (!targetUser) {
      return versionedResponse({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    // Get role to assign
    const roleToAssign = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!roleToAssign) {
      return versionedResponse({ error: 'תפקיד לא נמצא' }, { status: 404 })
    }

    // Check if user already has this role
    const existingAssignment = targetUser.roles.find((ur) => ur.roleId === roleId)
    if (existingAssignment) {
      return versionedResponse(
        { error: 'המשתמש כבר משויך לתפקיד זה' },
        { status: 400 }
      )
    }

    // Check RBAC modification permission
    const authCheck = canModifyRbac(
      userRoleNames,
      roleToAssign.name,
      targetUserId,
      actorUserId
    )

    if (!authCheck.allowed) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 403 })
    }

    // Assign role
    const previousRoles = targetUser.roles.map((ur) => ur.role.name)

    await prisma.userRole.create({
      data: {
        userId: targetUserId,
        roleId,
        createdBy: actorUserId,
      },
    })

    // If domain_head and domains provided, create domain assignments
    if (roleToAssign.name === 'domain_head' && domainsToAssign.length > 0) {
      for (const dId of domainsToAssign) {
        // Verify domain exists
        const domain = await prisma.domain.findUnique({
          where: { id: dId },
        })

        if (domain) {
          // Check if assignment already exists
          const existingDomainAssignment = await prisma.userDomainAssignment.findUnique({
            where: {
              userId_domainId: {
                userId: targetUserId,
                domainId: dId,
              },
            },
          })

          if (!existingDomainAssignment) {
            await prisma.userDomainAssignment.create({
              data: {
                userId: targetUserId,
                domainId: dId,
                createdBy: actorUserId,
              },
            })
          }
        }
      }
    }

    // Fetch updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        roles: {
          include: { role: true },
          orderBy: { role: { level: 'asc' } },
        },
      },
    })

    const newRoles = updatedUser?.roles.map((ur) => ur.role.name) || []

    // Audit log
    await logCrud(
      'CREATE',
      'admin',
      'user_role',
      targetUserId,
      targetUser.email,
      {
        action: 'assign',
        roleAssigned: roleToAssign.name,
        roleDisplayName: roleToAssign.displayName,
        domainsAssigned: domainsToAssign.length > 0 ? domainsToAssign : undefined,
        previousRoles,
        newRoles,
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
    console.error('Error assigning role:', error)
    return versionedResponse({ error: 'Failed to assign role' }, { status: 500 })
  }
}
