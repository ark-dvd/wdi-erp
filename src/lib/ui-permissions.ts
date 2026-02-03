// ================================================
// WDI ERP - UI Permission Utilities
// Version: 20260202-RBAC-V2-PHASE6
// Canonical UI permission checks for RBAC v2 compliance
// DOC-016 §6.1, FP-002: Permission-based, not role-based
// ================================================

/**
 * Check if user has permission for a module+action.
 * Reads from session.user.permissions array.
 *
 * Supports both formats (defensive):
 * - "module:action" (legacy)
 * - "module:action:scope" (RBAC v2)
 *
 * @param permissions - Array of permission strings from session
 * @param module - Module name (e.g., 'admin', 'hr', 'projects')
 * @param action - Action name (e.g., 'read', 'create', 'update', 'delete')
 * @returns true if permission exists, false otherwise
 */
export function canAccess(
  permissions: string[] | undefined | null,
  module: string,
  action: string
): boolean {
  // Defensive: handle missing/invalid permissions array
  if (!permissions || !Array.isArray(permissions)) {
    return false
  }

  // Defensive: handle missing module/action
  if (!module || !action) {
    return false
  }

  const normalizedAction = action.toLowerCase()

  return permissions.some((p) => {
    // Defensive: skip non-string entries
    if (typeof p !== 'string') {
      return false
    }

    const parts = p.split(':')

    // Defensive: need at least module:action
    if (parts.length < 2) {
      return false
    }

    const [permModule, permAction] = parts
    return (
      permModule === module &&
      permAction.toLowerCase() === normalizedAction
    )
  })
}

/**
 * Get the scope for a specific permission.
 *
 * @param permissions - Array of permission strings from session
 * @param module - Module name
 * @param action - Action name
 * @returns Scope string (e.g., 'ALL', 'SELF', 'ASSIGNED') or null if not found
 */
export function getScope(
  permissions: string[] | undefined | null,
  module: string,
  action: string
): string | null {
  // Defensive: handle missing/invalid permissions array
  if (!permissions || !Array.isArray(permissions)) {
    return null
  }

  // Defensive: handle missing module/action
  if (!module || !action) {
    return null
  }

  const normalizedAction = action.toLowerCase()

  const perm = permissions.find((p) => {
    // Defensive: skip non-string entries
    if (typeof p !== 'string') {
      return false
    }

    const parts = p.split(':')
    if (parts.length < 2) {
      return false
    }

    const [permModule, permAction] = parts
    return (
      permModule === module &&
      permAction.toLowerCase() === normalizedAction
    )
  })

  if (!perm) {
    return null
  }

  const parts = perm.split(':')
  // Return scope if present (3rd part), otherwise null
  return parts.length >= 3 ? parts[2] : null
}

// ================================================
// PRE-DEFINED CHECKS FOR COMMON PATTERNS
// ================================================

/**
 * Check if user can access Admin Console
 * Requires: admin:read permission
 */
export function canAccessAdmin(permissions: string[] | undefined | null): boolean {
  return canAccess(permissions, 'admin', 'read')
}

/**
 * Check if user can read HR data
 * Requires: hr:read permission
 */
export function canReadHR(permissions: string[] | undefined | null): boolean {
  return canAccess(permissions, 'hr', 'read')
}

/**
 * Get user's HR read scope
 * Returns: 'ALL', 'SELF', 'MAIN_PAGE', etc. or null
 */
export function getHRScope(permissions: string[] | undefined | null): string | null {
  return getScope(permissions, 'hr', 'read')
}

/**
 * Check if user can create contacts
 * Requires: contacts:create permission
 */
export function canCreateContacts(permissions: string[] | undefined | null): boolean {
  return canAccess(permissions, 'contacts', 'create')
}
