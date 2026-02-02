// ================================================
// WDI ERP - Permission Check System
// Version: 20260127-RBAC-V2
// Implements: DOC-013 §5 (Scopes), DOC-014 (Permission Matrix)
// ================================================
//
// This module provides the SINGLE SOURCE OF TRUTH for permission checks.
// All API routes MUST use these functions instead of hardcoded role arrays.
//
// ================================================

import { prisma } from './prisma'
import { Session } from 'next-auth'

// ================================================
// TYPES
// ================================================

export type Action = 'read' | 'create' | 'update' | 'delete'

export type Scope = 'ALL' | 'DOMAIN' | 'ASSIGNED' | 'OWN' | 'SELF' | 'MAIN_PAGE' | 'CONTACTS'

export interface TargetEntity {
  id?: string
  createdById?: string
  assignedToId?: string
  domainId?: string
  employeeId?: string  // For SELF scope on HR module
  projectId?: string   // For checking project assignment
}

export interface PermissionResult {
  granted: boolean
  scope?: Scope
  reason?: string
}

// ================================================
// CORE PERMISSION CHECK
// ================================================

/**
 * Check if a user has permission to perform an action on a module.
 * This is the CORE function that reads from the database.
 *
 * @param userId - The user's ID
 * @param module - The module name (e.g., 'projects', 'hr', 'contacts')
 * @param action - The action (read, create, update, delete)
 * @param targetEntity - Optional target entity for scope checking
 * @returns PermissionResult with granted status and scope
 */
export async function checkPermission(
  userId: string,
  module: string,
  action: Action,
  targetEntity?: TargetEntity
): Promise<PermissionResult> {
  // 1. Get user with roles and employee info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      employee: {
        select: { id: true },
      },
      domainAssignments: {
        select: { domainId: true },
      },
    },
  })

  if (!user) {
    return { granted: false, reason: 'USER_NOT_FOUND' }
  }

  if (!user.isActive) {
    return { granted: false, reason: 'USER_INACTIVE' }
  }

  if (user.roles.length === 0) {
    return { granted: false, reason: 'NO_ROLES' }
  }

  // 2. Collect all permissions for this module+action across all user's roles
  // Union-of-allows: if ANY role grants access, access is granted
  const matchingPermissions: { scope: string }[] = []

  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      const perm = rolePermission.permission
      if (perm.module === module && perm.action.toLowerCase() === action) {
        matchingPermissions.push({ scope: perm.scope })
      }
    }
  }

  if (matchingPermissions.length === 0) {
    return { granted: false, reason: 'NO_PERMISSION' }
  }

  // 3. Get the broadest scope (ALL > DOMAIN > ASSIGNED > OWN > SELF > MAIN_PAGE)
  const scopePrecedence: Record<string, number> = {
    'ALL': 1,
    'DOMAIN': 2,
    'ASSIGNED': 3,
    'OWN': 4,
    'SELF': 5,
    'MAIN_PAGE': 6,
    'CONTACTS': 7,
  }

  const sortedScopes = matchingPermissions
    .map(p => p.scope)
    .sort((a, b) => (scopePrecedence[a] || 99) - (scopePrecedence[b] || 99))

  const effectiveScope = sortedScopes[0] as Scope

  // 4. Check if target entity falls within scope
  const scopeCheck = await checkScope(effectiveScope, user, targetEntity, module)

  if (!scopeCheck.granted) {
    return { granted: false, scope: effectiveScope, reason: scopeCheck.reason }
  }

  return { granted: true, scope: effectiveScope }
}

// ================================================
// SCOPE CHECKING
// ================================================

async function checkScope(
  scope: Scope,
  user: {
    id: string
    employee: { id: string } | null
    domainAssignments: { domainId: string }[]
  },
  targetEntity: TargetEntity | undefined,
  module: string
): Promise<{ granted: boolean; reason?: string }> {
  switch (scope) {
    case 'ALL':
      // Unrestricted access
      return { granted: true }

    case 'DOMAIN':
      // Entity must be in user's assigned domain
      if (user.domainAssignments.length === 0) {
        return { granted: false, reason: 'NO_DOMAIN_ASSIGNMENT' }
      }
      if (targetEntity?.domainId) {
        const userDomainIds = user.domainAssignments.map(d => d.domainId)
        if (!userDomainIds.includes(targetEntity.domainId)) {
          return { granted: false, reason: 'OUT_OF_DOMAIN' }
        }
      }
      return { granted: true }

    case 'ASSIGNED':
      // User must be assigned to the project
      if (!targetEntity?.projectId && !targetEntity?.id) {
        // No specific target = listing, allow but filter server-side
        return { granted: true }
      }
      const projectId = targetEntity.projectId || targetEntity.id
      if (projectId) {
        const isAssigned = await checkProjectAssignment(user.id, user.employee?.id, projectId)
        if (!isAssigned) {
          return { granted: false, reason: 'NOT_ASSIGNED_TO_PROJECT' }
        }
      }
      return { granted: true }

    case 'OWN':
      // Entity must be created by or assigned to user
      if (!targetEntity?.id) {
        // No specific target = listing, allow but filter server-side
        return { granted: true }
      }
      if (targetEntity.createdById === user.id) {
        return { granted: true }
      }
      if (targetEntity.assignedToId === user.id) {
        return { granted: true }
      }
      if (user.employee && targetEntity.assignedToId === user.employee.id) {
        return { granted: true }
      }
      return { granted: false, reason: 'NOT_OWNER' }

    case 'SELF':
      // Only user's own HR record
      if (module === 'hr') {
        if (!user.employee) {
          return { granted: false, reason: 'NO_EMPLOYEE_RECORD' }
        }
        if (targetEntity?.employeeId && targetEntity.employeeId !== user.employee.id) {
          return { granted: false, reason: 'NOT_SELF' }
        }
        if (targetEntity?.id && targetEntity.id !== user.employee.id) {
          return { granted: false, reason: 'NOT_SELF' }
        }
      }
      return { granted: true }

    case 'MAIN_PAGE':
      // Only list view, not individual records
      if (targetEntity?.id) {
        return { granted: false, reason: 'MAIN_PAGE_ONLY' }
      }
      return { granted: true }

    case 'CONTACTS':
      // Only contacts section of records
      // This is a special scope for Administration role
      return { granted: true }

    default:
      return { granted: false, reason: 'UNKNOWN_SCOPE' }
  }
}

/**
 * Check if user is assigned to a project (as lead, manager, or coordinator)
 */
async function checkProjectAssignment(
  userId: string,
  employeeId: string | undefined,
  projectId: string
): Promise<boolean> {
  if (!employeeId) {
    return false
  }

  // Check if user is project lead, manager, or coordinator
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      managers: { where: { employeeId } },
      coordinators: { where: { employeeId } },
    },
  })

  if (!project) {
    return false
  }

  // Check lead
  if (project.leadId === employeeId) {
    return true
  }

  // Check managers
  if (project.managers.length > 0) {
    return true
  }

  // Check coordinators
  if (project.coordinators.length > 0) {
    return true
  }

  // Phase 1 / FP-006: Visibility Grants removed - assignment is ONLY through
  // lead, manager, or coordinator roles. No VG fallback.
  return false
}

// ================================================
// API ROUTE HELPER
// ================================================

/**
 * Helper for API routes - returns a Response if permission denied, null if granted.
 *
 * Usage in API routes:
 * ```typescript
 * const denied = await requirePermission(session, 'projects', 'create');
 * if (denied) return denied;
 * ```
 *
 * @param session - NextAuth session
 * @param module - Module name
 * @param action - Action to perform
 * @param targetEntity - Optional target entity for scope checking
 * @returns Response if denied, null if granted
 */
export async function requirePermission(
  session: Session | null,
  module: string,
  action: Action,
  targetEntity?: TargetEntity
): Promise<Response | null> {
  if (!session?.user) {
    return new Response(
      JSON.stringify({ error: 'אין לך הרשאה' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const userId = (session.user as any).id
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User ID not found in session' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const result = await checkPermission(userId, module, action, targetEntity)

  if (!result.granted) {
    console.log(`Permission denied: user=${userId}, module=${module}, action=${action}, reason=${result.reason}`)
    return new Response(
      JSON.stringify({ error: 'אין לך הרשאה' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return null // Permission granted
}

// ================================================
// QUICK ROLE CHECKS (for backwards compatibility)
// ================================================

/**
 * Check if user has any of the specified roles.
 * Use this ONLY for admin-specific checks where role-based access is required.
 * For normal permission checks, use checkPermission/requirePermission.
 */
export async function hasRole(userId: string, roleNames: string[]): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: { role: true },
      },
    },
  })

  if (!user) return false

  return user.roles.some(ur => roleNames.includes(ur.role.name))
}

/**
 * Check if user has admin access (owner or trust_officer).
 * Use this ONLY for Admin Console access checks.
 */
export async function hasAdminAccess(userId: string): Promise<boolean> {
  return hasRole(userId, ['owner', 'trust_officer'])
}

// ================================================
// SCOPE FILTER HELPERS (for list queries)
// ================================================

/**
 * Get filter conditions for list queries based on user's permission scope.
 *
 * @param userId - User ID
 * @param module - Module name
 * @returns Prisma where clause to filter results
 */
export async function getPermissionFilter(
  userId: string,
  module: string
): Promise<{ where: any; scope: Scope } | null> {
  const result = await checkPermission(userId, module, 'read')

  if (!result.granted || !result.scope) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: { select: { id: true } },
      domainAssignments: { select: { domainId: true } },
    },
  })

  if (!user) return null

  switch (result.scope) {
    case 'ALL':
      return { where: {}, scope: 'ALL' }

    case 'DOMAIN':
      const domainIds = user.domainAssignments.map(d => d.domainId)
      return {
        where: { domainId: { in: domainIds } },
        scope: 'DOMAIN',
      }

    case 'ASSIGNED':
      // Get assigned project IDs
      const assignedProjects = await getAssignedProjectIds(userId, user.employee?.id)
      return {
        where: { id: { in: assignedProjects } },
        scope: 'ASSIGNED',
      }

    case 'OWN':
      const ownFilter: any = { OR: [{ createdById: userId }] }
      if (user.employee) {
        ownFilter.OR.push({ assignedToId: user.employee.id })
      }
      return { where: ownFilter, scope: 'OWN' }

    case 'SELF':
      if (!user.employee) return null
      return {
        where: { id: user.employee.id },
        scope: 'SELF',
      }

    case 'MAIN_PAGE':
      // For MAIN_PAGE, return empty filter but mark scope
      return { where: {}, scope: 'MAIN_PAGE' }

    default:
      return { where: {}, scope: result.scope }
  }
}

/**
 * Get list of project IDs the user is assigned to
 */
async function getAssignedProjectIds(
  userId: string,
  employeeId: string | undefined
): Promise<string[]> {
  const projectIds: string[] = []

  if (employeeId) {
    // Projects where user is lead
    const ledProjects = await prisma.project.findMany({
      where: { leadId: employeeId },
      select: { id: true },
    })
    projectIds.push(...ledProjects.map(p => p.id))

    // Projects where user is manager
    const managedProjects = await prisma.projectManager.findMany({
      where: { employeeId },
      select: { projectId: true },
    })
    projectIds.push(...managedProjects.map(p => p.projectId))

    // Projects where user is coordinator
    const coordinatedProjects = await prisma.projectCoordinator.findMany({
      where: { employeeId },
      select: { projectId: true },
    })
    projectIds.push(...coordinatedProjects.map(p => p.projectId))
  }

  // Phase 1 / FP-006: Visibility Grants removed - no VG-based project access

  // Remove duplicates
  return Array.from(new Set(projectIds))
}
