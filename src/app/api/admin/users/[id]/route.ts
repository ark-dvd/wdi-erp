// ================================================
// WDI ERP - Admin User Detail API
// Version: 20260125-RBAC-V1
// Implements: GET /api/admin/users/[id], PATCH /api/admin/users/[id]
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
  loadUserAuthContext,
  evaluateAuthorization,
  type CanonicalRole,
  type Module,
  type Operation,
  type Scope,
} from '@/lib/authorization'

// ================================================
// CANONICAL MODULES (DOC-013)
// ================================================

const CANONICAL_MODULES: { key: Module; enabled: boolean }[] = [
  { key: 'events', enabled: true },
  { key: 'projects', enabled: true },
  { key: 'hr', enabled: true },
  { key: 'contacts', enabled: true },
  { key: 'vendors', enabled: true },
  { key: 'equipment', enabled: true },
  { key: 'vehicles', enabled: true },
  { key: 'knowledge_repository', enabled: true },
  { key: 'financial', enabled: false }, // Placeholder - inactive
  { key: 'agent', enabled: true },
  { key: 'admin', enabled: true },
]

const OPERATIONS: Operation[] = ['READ', 'CREATE', 'UPDATE', 'DELETE']

// ================================================
// GET /api/admin/users/[id]
// Returns user detail with effective permissions matrix
// ================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC v1: Check admin authorization (with fallback)
    if (!checkAdminAccess(session)) {
      return versionedResponse({ error: 'אין הרשאה לצפות בפרטי משתמש' }, { status: 403 })
    }

    const userRoles = (session.user as any)?.roles || []
    const userRoleNames: CanonicalRole[] = userRoles.map((r: { name: string }) => r.name)

    const { id } = await params

    // Fetch user with roles and employee info
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                level: true,
                description: true,
              },
            },
          },
          orderBy: { role: { level: 'asc' } },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            department: true,
            phone: true,
            email: true,
            photoUrl: true,
          },
        },
        domainAssignments: {
          include: {
            domain: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return versionedResponse({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    // Load user auth context to evaluate effective permissions
    const authContext = await loadUserAuthContext(id)

    // Build effective permissions matrix using evaluateAuthorization
    const effectivePermissions: Record<
      string,
      { enabled: boolean; permissions: Record<string, { allowed: boolean; scope: Scope | null }> }
    > = {}

    for (const module of CANONICAL_MODULES) {
      if (!module.enabled) {
        // Finance is placeholder - mark as disabled
        effectivePermissions[module.key] = {
          enabled: false,
          permissions: {
            READ: { allowed: false, scope: null },
            CREATE: { allowed: false, scope: null },
            UPDATE: { allowed: false, scope: null },
            DELETE: { allowed: false, scope: null },
          },
        }
        continue
      }

      const modulePermissions: Record<string, { allowed: boolean; scope: Scope | null }> = {}

      for (const operation of OPERATIONS) {
        if (authContext) {
          const result = await evaluateAuthorization(authContext, {
            module: module.key as Module,
            operation,
          })
          modulePermissions[operation] = {
            allowed: result.authorized,
            scope: result.effectiveScope || null,
          }
        } else {
          modulePermissions[operation] = { allowed: false, scope: null }
        }
      }

      effectivePermissions[module.key] = {
        enabled: true,
        permissions: modulePermissions,
      }
    }

    // Build flat permissions array for EffectivePermissionsTable component
    const flatPermissions: { module: string; action: string; scope: string }[] = []
    for (const [moduleKey, moduleData] of Object.entries(effectivePermissions)) {
      if (moduleData.enabled) {
        for (const [action, permData] of Object.entries(moduleData.permissions)) {
          if (permData.allowed && permData.scope) {
            flatPermissions.push({
              module: moduleKey,
              action,
              scope: permData.scope,
            })
          }
        }
      }
    }

    // Transform response
    const response = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      employee: user.employee,
      roles: user.roles.map((ur) => ur.role),
      domains: user.domainAssignments.map((da) => da.domain),
      effectivePermissions,
      permissions: flatPermissions, // Flat array for UI component
    }

    return versionedResponse(response)
  } catch (error) {
    console.error('Error fetching user detail:', error)
    return versionedResponse({ error: 'Failed to fetch user detail' }, { status: 500 })
  }
}

// ================================================
// PATCH /api/admin/users/[id]
// Activate/deactivate user
// Safety rules: Cannot deactivate self, cannot deactivate last owner
// ================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const actorUserId = (session.user as any)?.id
    const userRoles = (session.user as any)?.roles || []
    const userRoleNames: CanonicalRole[] = userRoles.map((r: { name: string }) => r.name)

    // RBAC v1: Check admin authorization (with fallback)
    if (!checkAdminAccess(session)) {
      return versionedResponse({ error: 'אין הרשאה לעדכן משתמשים' }, { status: 403 })
    }

    const { id: targetUserId } = await params
    const data = await request.json()
    const { isActive } = data

    // Validate input
    if (typeof isActive !== 'boolean') {
      return validationError({ isActive: 'שדה isActive חייב להיות boolean' })
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

    const targetRoleNames = targetUser.roles.map((ur) => ur.role.name)

    // Safety rule 1: Cannot deactivate self
    if (!isActive && targetUserId === actorUserId) {
      return versionedResponse(
        { error: 'לא ניתן להשבית את המשתמש שלך' },
        { status: 400 }
      )
    }

    // Safety rule 2: Cannot deactivate last owner
    if (!isActive && targetRoleNames.includes('owner')) {
      // Count active owners
      const activeOwnerCount = await prisma.user.count({
        where: {
          isActive: true,
          roles: {
            some: {
              role: { name: 'owner' },
            },
          },
        },
      })

      if (activeOwnerCount <= 1) {
        return versionedResponse(
          { error: 'לא ניתן להשבית את הבעלים האחרון במערכת' },
          { status: 400 }
        )
      }
    }

    // Check RBAC modification permission
    // Trust officer cannot modify owner
    if (targetRoleNames.includes('owner')) {
      const authCheck = canModifyRbac(userRoleNames, 'owner', targetUserId, actorUserId)
      if (!authCheck.allowed) {
        return versionedResponse(
          { error: 'אין הרשאה לשנות סטטוס של בעלים' },
          { status: 403 }
        )
      }
    }

    // Update user
    const previousStatus = targetUser.isActive
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      include: {
        roles: {
          include: { role: true },
          orderBy: { role: { level: 'asc' } },
        },
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Audit log
    await logCrud(
      'UPDATE',
      'admin',
      'user',
      targetUserId,
      targetUser.email,
      {
        field: 'isActive',
        previousValue: previousStatus,
        newValue: isActive,
        action: isActive ? 'activate' : 'deactivate',
      }
    )

    return versionedResponse({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isActive: updatedUser.isActive,
        roles: updatedUser.roles.map((ur) => ur.role),
        employee: updatedUser.employee,
      },
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return versionedResponse({ error: 'Failed to update user' }, { status: 500 })
  }
}
