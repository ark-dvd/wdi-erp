// ================================================
// WDI ERP - Admin User Role Removal API
// Version: 20260125-RBAC-V1
// Implements: DELETE /api/admin/users/[id]/roles/[roleId]
// RBAC v1: Per DOC-013 §10.2
// ================================================

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { versionedResponse } from '@/lib/api-contracts'
import {
  RBAC_ADMIN_ROLES,
  canModifyRbac,
  checkAdminAccess,
  type CanonicalRole,
} from '@/lib/authorization'

// ================================================
// DELETE /api/admin/users/[id]/roles/[roleId]
// Remove role from user
// Safety rules:
//   - Cannot remove last owner
//   - Trust officer cannot remove owner role
//   - Cannot remove role from self if it removes admin access
// ================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const actorUserId = (session.user as any)?.id
    const actorRoles = (session.user as any)?.roles || []
    const actorRoleNames: CanonicalRole[] = actorRoles.map((r: { name: string }) => r.name)

    // RBAC v1: Check admin authorization (with fallback)
    if (!checkAdminAccess(session)) {
      return versionedResponse({ error: 'אין הרשאה להסרת תפקידים' }, { status: 403 })
    }

    const { id: targetUserId, roleId } = await params

    // Get target user with their roles
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

    // Get the role being removed
    const roleToRemove = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!roleToRemove) {
      return versionedResponse({ error: 'תפקיד לא נמצא' }, { status: 404 })
    }

    // Check if user actually has this role
    const existingAssignment = targetUser.roles.find((ur) => ur.roleId === roleId)
    if (!existingAssignment) {
      return versionedResponse(
        { error: 'המשתמש אינו משויך לתפקיד זה' },
        { status: 400 }
      )
    }

    // Safety rule 1: Cannot remove all_employees (base role)
    if (roleToRemove.name === 'all_employees') {
      return versionedResponse(
        { error: 'לא ניתן להסיר את תפקיד הבסיס (כל העובדים)' },
        { status: 400 }
      )
    }

    // Safety rule 2: Cannot remove last owner
    if (roleToRemove.name === 'owner') {
      // Count users with owner role
      const ownerCount = await prisma.userRole.count({
        where: {
          role: { name: 'owner' },
          user: { isActive: true },
        },
      })

      if (ownerCount <= 1) {
        return versionedResponse(
          { error: 'לא ניתן להסיר את תפקיד הבעלים האחרון במערכת' },
          { status: 400 }
        )
      }
    }

    // Safety rule 3: Check RBAC modification permission
    const authCheck = canModifyRbac(
      actorRoleNames,
      roleToRemove.name,
      targetUserId,
      actorUserId
    )

    if (!authCheck.allowed) {
      let errorMsg = 'אין הרשאה להסיר תפקיד זה'
      if (authCheck.reason === 'CANNOT_MODIFY_OWNER') {
        errorMsg = 'אין הרשאה להסיר תפקיד בעלים'
      } else if (authCheck.reason === 'CANNOT_MODIFY_SELF') {
        errorMsg = 'אין הרשאה לשנות את התפקידים שלך'
      }
      return versionedResponse({ error: errorMsg }, { status: 403 })
    }

    // Safety rule 4: Cannot remove role from self if it removes admin access
    if (targetUserId === actorUserId) {
      const targetRoleNames = targetUser.roles.map((ur) => ur.role.name)
      const remainingRoles = targetRoleNames.filter((r) => r !== roleToRemove.name)
      const willRetainAdminAccess = remainingRoles.some((r) =>
        RBAC_ADMIN_ROLES.includes(r as CanonicalRole)
      )

      if (!willRetainAdminAccess && RBAC_ADMIN_ROLES.includes(roleToRemove.name as CanonicalRole)) {
        return versionedResponse(
          { error: 'לא ניתן להסיר את התפקיד שמעניק לך גישת ניהול' },
          { status: 400 }
        )
      }
    }

    // Remove role
    const previousRoles = targetUser.roles.map((ur) => ur.role.name)

    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId: targetUserId,
          roleId,
        },
      },
    })

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
      'DELETE',
      'admin',
      'user_role',
      targetUserId,
      targetUser.email,
      {
        action: 'remove',
        roleRemoved: roleToRemove.name,
        roleDisplayName: roleToRemove.displayName,
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
    console.error('Error removing role:', error)
    return versionedResponse({ error: 'Failed to remove role' }, { status: 500 })
  }
}
