// ================================================
// WDI ERP - RBAC v1 Authorization Library
// Version: 20260125-RBAC-V1
// Implements: DOC-013 RBAC Authorization Matrix v1.1
// ================================================

import { prisma } from './prisma'
import { Session } from 'next-auth'

// ================================================
// CANONICAL TYPES (DOC-013 §4-5)
// ================================================

export type CanonicalRole =
  | 'owner'
  | 'executive'
  | 'trust_officer'
  | 'pmo'
  | 'finance_officer'
  | 'domain_head'
  | 'project_manager'
  | 'project_coordinator'
  | 'administration'
  | 'all_employees'

export type Scope = 'ALL' | 'DOMAIN' | 'PROJECT' | 'OWN' | 'SELF'

export type Operation = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'ADMIN' | 'QUERY'

export type Module =
  | 'contacts'           // Aligned with seed-permissions-v2.ts
  | 'hr'
  | 'projects'
  | 'events'
  | 'vendors'
  | 'vehicles'
  | 'equipment'
  | 'documents'
  | 'admin'
  | 'agent'
  | 'knowledge_repository'
  | 'financial'          // Aligned with seed-permissions-v2.ts

// ================================================
// HR METADATA FIELDS (DOC-013 §2.1, §6.3)
// ================================================

export const HR_METADATA_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'role',           // Job title
  'department',
  'status',
  'photoUrl',
  'email',          // Work email
  'phone',          // Work phone
] as const

export const HR_SENSITIVE_FIELDS = [
  'idNumber',
  'address',
  'personalEmail',
  'grossSalary',
  'contractFileUrl',
  'spouseFirstName',
  'spouseLastName',
  'spouseIdNumber',
  'spouseBirthDate',
  'spousePhone',
  'spouseEmail',
  'marriageDate',
  'children',
  'education',
  'certifications',
  'idCardFileUrl',
  'idCardSpouseFileUrl',
  'driversLicenseFileUrl',
  'birthDate',      // Full birthdate is sensitive
  'startDate',      // Employment dates
  'endDate',
  'employmentType',
  'employeeCategory',
  'employmentPercent',
  'securityClearance',
] as const

// ================================================
// AUTHORIZATION CHECK RESULT
// ================================================

export interface AuthorizationResult {
  authorized: boolean
  effectiveScope?: Scope
  reason?: string
  // For filtering queries
  scopeFilter?: {
    domainIds?: string[]
    projectIds?: string[]
    userId?: string
    employeeId?: string
  }
}

export interface AuthorizationCheck {
  module: Module
  operation: Operation
  targetEntity?: {
    id?: string
    domainId?: string
    projectId?: string
    createdById?: string
    employeeId?: string  // For HR self-access
  }
}

// ================================================
// SCOPE PRECEDENCE (DOC-013 §5.2)
// ================================================

const SCOPE_PRECEDENCE: Record<Scope, number> = {
  'ALL': 1,
  'DOMAIN': 2,
  'PROJECT': 3,
  'OWN': 4,
  'SELF': 5,
}

function getBroadestScope(scopes: Scope[]): Scope | null {
  if (scopes.length === 0) return null
  return scopes.reduce((broadest, current) => {
    return SCOPE_PRECEDENCE[current] < SCOPE_PRECEDENCE[broadest] ? current : broadest
  })
}

// ================================================
// USER CONTEXT LOADING
// ================================================

export interface UserAuthContext {
  userId: string
  employeeId?: string | null
  roles: { id: string; name: string }[]
  permissions: { module: string; action: string; scope: string }[]
  assignedDomainIds: string[]
  assignedProjectIds: string[]
  visibilityGrantProjectIds: string[]
}

/**
 * Load full authorization context for a user from database
 * This is called once per request and cached
 */
export async function loadUserAuthContext(userId: string): Promise<UserAuthContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        select: { id: true },
      },
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
      domainAssignments: {
        where: { domain: { isActive: true } },
        select: { domainId: true },
      },
      visibilityGrantsReceived: {
        where: { isActive: true },
        select: { projectId: true },
      },
    },
  })

  if (!user) return null

  // Get assigned projects through employee relationships
  let assignedProjectIds: string[] = []
  if (user.employee) {
    const employee = await prisma.employee.findUnique({
      where: { id: user.employee.id },
      include: {
        managedProjects: { select: { projectId: true } },
        coordinatedProjects: { select: { projectId: true } },
        ledProjects: { select: { id: true } },
      },
    })

    if (employee) {
      assignedProjectIds = [
        ...employee.managedProjects.map((p) => p.projectId),
        ...employee.coordinatedProjects.map((p) => p.projectId),
        ...employee.ledProjects.map((p) => p.id),
      ]
    }
  }

  // Flatten permissions from all roles (union-of-allows)
  const permissions: { module: string; action: string; scope: string }[] = []
  const roles: { id: string; name: string }[] = []

  for (const userRole of user.roles) {
    roles.push({ id: userRole.role.id, name: userRole.role.name })
    for (const rp of userRole.role.permissions) {
      permissions.push({
        module: rp.permission.module,
        action: rp.permission.action.toUpperCase(),  // Normalize to uppercase for Operation type
        scope: rp.permission.scope,
      })
    }
  }

  return {
    userId,
    employeeId: user.employee?.id,
    roles,
    permissions,
    assignedDomainIds: user.domainAssignments.map((d) => d.domainId),
    assignedProjectIds,
    visibilityGrantProjectIds: user.visibilityGrantsReceived.map((g) => g.projectId),
  }
}

// ================================================
// CORE AUTHORIZATION FUNCTION (DOC-013 §2.1)
// ================================================

/**
 * Evaluate authorization for a specific operation
 * Implements DOC-013 permission evaluation algorithm
 */
export async function evaluateAuthorization(
  context: UserAuthContext,
  check: AuthorizationCheck
): Promise<AuthorizationResult> {
  const { module, operation, targetEntity } = check

  // Step 1: Default Deny (DOC-013 §3.1)
  if (context.roles.length === 0) {
    return { authorized: false, reason: 'NO_ROLES' }
  }

  // Step 2: Collect matching permissions (union-of-allows)
  const matchingPermissions = context.permissions.filter(
    (p) => p.module === module && p.action === operation
  )

  // Step 3: If no matching permission, deny
  if (matchingPermissions.length === 0) {
    return { authorized: false, reason: 'NO_PERMISSION' }
  }

  // Step 4: Resolve effective scope (broadest wins)
  const scopes = matchingPermissions.map((p) => p.scope as Scope)
  const effectiveScope = getBroadestScope(scopes)

  if (!effectiveScope) {
    return { authorized: false, reason: 'NO_VALID_SCOPE' }
  }

  // Step 5: Check if target entity falls within scope
  const scopeCheckResult = checkEntityWithinScope(effectiveScope, context, targetEntity)

  if (!scopeCheckResult.authorized) {
    return { authorized: false, effectiveScope, reason: 'OUT_OF_SCOPE' }
  }

  return {
    authorized: true,
    effectiveScope,
    scopeFilter: scopeCheckResult.scopeFilter,
  }
}

/**
 * Check if entity falls within the given scope
 */
function checkEntityWithinScope(
  scope: Scope,
  context: UserAuthContext,
  targetEntity?: AuthorizationCheck['targetEntity']
): { authorized: boolean; scopeFilter?: AuthorizationResult['scopeFilter'] } {
  switch (scope) {
    case 'ALL':
      // Unrestricted access
      return { authorized: true }

    case 'DOMAIN':
      // Entity must be in user's assigned domains
      if (context.assignedDomainIds.length === 0) {
        return { authorized: false }
      }
      if (targetEntity?.domainId && !context.assignedDomainIds.includes(targetEntity.domainId)) {
        return { authorized: false }
      }
      return {
        authorized: true,
        scopeFilter: { domainIds: context.assignedDomainIds },
      }

    case 'PROJECT':
      // Entity must be in assigned projects OR visibility grants (for READ only)
      const allProjectIds = [
        ...context.assignedProjectIds,
        ...context.visibilityGrantProjectIds,
      ]
      if (allProjectIds.length === 0) {
        return { authorized: false }
      }
      if (targetEntity?.projectId && !allProjectIds.includes(targetEntity.projectId)) {
        return { authorized: false }
      }
      return {
        authorized: true,
        scopeFilter: { projectIds: allProjectIds },
      }

    case 'OWN':
      // Entity must be created by or assigned to user
      if (targetEntity?.createdById && targetEntity.createdById !== context.userId) {
        return { authorized: false }
      }
      return {
        authorized: true,
        scopeFilter: { userId: context.userId },
      }

    case 'SELF':
      // Only user's own HR record
      if (!context.employeeId) {
        return { authorized: false }
      }
      if (targetEntity?.employeeId && targetEntity.employeeId !== context.employeeId) {
        return { authorized: false }
      }
      return {
        authorized: true,
        scopeFilter: { employeeId: context.employeeId },
      }

    default:
      return { authorized: false }
  }
}

// ================================================
// VISIBILITY GRANT CONSTRAINTS (DOC-013 §8)
// ================================================

/**
 * Check if operation is allowed through visibility grant
 * Visibility grants only enable READ operations
 */
export function isVisibilityGrantAllowed(
  operation: Operation,
  projectId: string,
  context: UserAuthContext
): boolean {
  // V-001: Visibility grants are read-only
  if (operation !== 'READ') {
    return false
  }

  return context.visibilityGrantProjectIds.includes(projectId)
}

/**
 * Check if user has write access to project (not through visibility grant)
 * Per DOC-013 §8.4 V-001
 */
export function canWriteToProject(projectId: string, context: UserAuthContext): boolean {
  return context.assignedProjectIds.includes(projectId)
}

// ================================================
// HR SCOPE LIMITATION (DOC-013 §6.3)
// ================================================

/**
 * Get HR data projection based on scope
 * DOMAIN and PROJECT scope return metadata only
 */
export function getHrProjection(scope: Scope): 'FULL' | 'METADATA' {
  switch (scope) {
    case 'ALL':
      return 'FULL'
    case 'SELF':
      return 'FULL'  // Own record
    case 'DOMAIN':
    case 'PROJECT':
    case 'OWN':
      return 'METADATA'  // M-005, M-006
    default:
      return 'METADATA'
  }
}

/**
 * Filter HR fields based on projection type
 */
export function filterHrFields<T extends Record<string, any>>(
  data: T,
  projection: 'FULL' | 'METADATA'
): Partial<T> {
  if (projection === 'FULL') {
    return data
  }

  // Return only metadata fields
  const result: Partial<T> = {}
  for (const field of HR_METADATA_FIELDS) {
    if (field in data) {
      result[field as keyof T] = data[field as keyof T]
    }
  }
  return result
}

// ================================================
// SESSION HELPERS
// ================================================

export interface ExtendedSession extends Session {
  user: Session['user'] & {
    id?: string
    roles?: { name: string }[]
    role?: string  // Primary role string (backwards compat)
    employeeId?: string | null
    permissions?: string[]  // "module:action:scope" format
  }
}

/**
 * Check if user has admin access (owner or trust_officer)
 * Checks both roles array AND primary role string for robustness
 * DOC-013 §10.2
 */
export function checkAdminAccess(session: any): boolean {
  // Check roles array first
  const userRoles = session?.user?.roles || []
  const userRoleNames = userRoles.map((r: { name: string }) => r?.name).filter(Boolean)

  if (userRoleNames.some((r: string) => RBAC_ADMIN_ROLES.includes(r as CanonicalRole))) {
    return true
  }

  // Fallback to primary role string
  const primaryRole = session?.user?.role
  if (primaryRole && RBAC_ADMIN_ROLES.includes(primaryRole as CanonicalRole)) {
    return true
  }

  return false
}

/**
 * Get primary role from session (highest privilege)
 */
export function getPrimaryRole(session: ExtendedSession): string | null {
  const roles = session.user?.roles
  if (!roles || roles.length === 0) return null

  // Return the role with lowest level (highest privilege) - RBAC v2 per DOC-013 §4.1
  const roleOrder: CanonicalRole[] = [
    'owner',
    'executive',
    'trust_officer',
    'pmo',
    'finance_officer',
    'domain_head',
    'project_manager',
    'project_coordinator',
    'administration',
    'all_employees',
  ]

  for (const orderedRole of roleOrder) {
    if (roles.some((r) => r.name === orderedRole)) {
      return orderedRole
    }
  }

  return roles[0]?.name || null
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(session: ExtendedSession, roleNames: CanonicalRole[]): boolean {
  const roles = session.user?.roles
  if (!roles) return false
  return roles.some((r) => roleNames.includes(r.name as CanonicalRole))
}

// ================================================
// AGENT PROHIBITION (DOC-013 §9)
// ================================================

/**
 * Modules that the Agent is absolutely prohibited from accessing
 */
export const AGENT_PROHIBITED_MODULES: Module[] = ['hr']

/**
 * Check if Agent can access a module
 */
export function isAgentModuleAllowed(module: Module): boolean {
  return !AGENT_PROHIBITED_MODULES.includes(module)
}

// ================================================
// RBAC ADMIN CONSTRAINTS (DOC-013 §10.2)
// ================================================

/**
 * Roles that can modify RBAC configuration
 */
export const RBAC_ADMIN_ROLES: CanonicalRole[] = ['owner', 'trust_officer']

/**
 * Check if user can modify RBAC
 * G-001: Trust Officer cannot modify Owner permissions
 * G-002: Trust Officer cannot modify own permissions
 */
export function canModifyRbac(
  actorRoles: CanonicalRole[],
  targetRoleName?: string,
  targetUserId?: string,
  actorUserId?: string
): { allowed: boolean; reason?: string } {
  const isOwner = actorRoles.includes('owner')
  const isTrustOfficer = actorRoles.includes('trust_officer')

  if (!isOwner && !isTrustOfficer) {
    return { allowed: false, reason: 'NOT_RBAC_ADMIN' }
  }

  // Owner can modify anything
  if (isOwner) {
    return { allowed: true }
  }

  // Trust Officer constraints
  if (isTrustOfficer) {
    // G-001: Cannot modify Owner permissions
    if (targetRoleName === 'owner') {
      return { allowed: false, reason: 'CANNOT_MODIFY_OWNER' }
    }

    // G-002: Cannot modify own permissions
    if (targetUserId && targetUserId === actorUserId) {
      return { allowed: false, reason: 'CANNOT_MODIFY_SELF' }
    }

    return { allowed: true }
  }

  return { allowed: false, reason: 'UNKNOWN' }
}

// ================================================
// CONVENIENCE FUNCTIONS
// ================================================

/**
 * Quick check if user has permission (without loading full context)
 * For use when you already have permissions from session
 */
export function hasPermission(
  permissions: string[],  // "module:action:scope" format
  module: Module,
  operation: Operation
): boolean {
  return permissions.some((p) => {
    const [m, a] = p.split(':')
    return m === module && a === operation
  })
}

/**
 * Get scopes for a specific permission from session
 */
export function getPermissionScopes(
  permissions: string[],
  module: Module,
  operation: Operation
): Scope[] {
  return permissions
    .filter((p) => {
      const [m, a] = p.split(':')
      return m === module && a === operation
    })
    .map((p) => p.split(':')[2] as Scope)
}
