// ================================================
// WDI ERP - Admin User Role Removal API
// Version: 20260202-RBAC-V2-PHASE3
// Implements: DELETE /api/admin/users/[id]/roles/[roleId]
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// RBAC v2 / INV-007: Single role enforcement per DOC-016 v2.0
// RBAC mutation: Uses canModifyRbac (DOC-016 §6.3)
// ================================================

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { versionedResponse } from '@/lib/api-contracts'
import { canModifyRbac, type CanonicalRole } from '@/lib/authorization'
import { requirePermission } from '@/lib/permissions'

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
    if (!session?.user) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v2 / DOC-016 §6.1: Operation-specific permission check
    const denied = await requirePermission(session, 'admin', 'delete')
    if (denied) return denied

    const actorUserId = (session.user as any)?.id
    const actorRoles = (session.user as any)?.roles || []
    const actorRoleNames: CanonicalRole[] = actorRoles.map((r: { name: string }) => r.name)

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

    // RBAC v2 / INV-007: Single role enforcement
    // Safety rule 1: Cannot remove user's only role (would leave them with no role)
    // Use POST to CHANGE the role instead
    if (targetUser.roles.length <= 1) {
      return versionedResponse(
        { error: 'לא ניתן להסיר את התפקיד היחיד של המשתמש. השתמש בשינוי תפקיד במקום.' },
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
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 403 })
    }

    // Note: Safety rule 4 (self-lockout prevention) removed per INV-007 single role enforcement
    // With INV-007, users can only have ONE role, so the check at lines 84-89 will always
    // trigger first, making this code path unreachable.

    // Remove role (RBAC v2: use userId unique key)
    const previousRoles = targetUser.roles.map((ur) => ur.role.name)

    await prisma.userRole.delete({
      where: {
        userId: targetUserId,
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
