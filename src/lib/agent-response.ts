/**
 * Stage 6.3 Remediation: Agent Response Framework
 *
 * R5: Explicit Uncertainty & Refusal Framework
 *
 * This module defines structured response states that the Agent must use.
 * No response can exist outside these states. Each state has explicit
 * semantics that prevent hallucination and enforce transparency.
 */

// ============================================================================
// Response State Types (R5)
// ============================================================================

export type AgentResponseState =
  | 'ANSWER_WITH_DATA'        // Data found, verified, response grounded
  | 'ANSWER_WITH_ESTIMATION'  // Analysis/estimation, explicitly labeled
  | 'NO_RESULTS'              // Query succeeded, authorized, but no records found
  | 'NOT_AUTHORIZED'          // User lacks access rights for ALL requested data
  | 'PARTIAL'                 // Some data returned, some blocked by permissions
  | 'REFUSE_NO_PERMISSION'    // (internal) Function-level denial during execution
  | 'REFUSE_NO_DATA'          // (internal) Query succeeded but no records
  | 'REFUSE_UNCERTAIN'        // Cannot determine answer with confidence
  | 'REFUSE_QUERY_FAILED'     // Technical failure during query
  | 'REFUSE_MANIPULATION'     // Detected attempt to bypass safety

export interface AgentResponseMetadata {
  state: AgentResponseState
  timestamp: string
  queryId: string
  userId: string
  userRole: string
  module?: string
  function?: string
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  isEstimation?: boolean
  estimationDisclaimer?: string
  dataSource?: string
  recordCount?: number
  permissionDenied?: boolean
  manipulationDetected?: boolean
  errorCode?: string
}

export interface AgentResponse<T = unknown> {
  meta: AgentResponseMetadata
  data: T | null
  message: string
  hedging?: string // R2: Explicit hedging for estimations
}

// ============================================================================
// Response State Builders (R5)
// ============================================================================

function generateQueryId(): string {
  return `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createDataResponse<T>(
  data: T,
  options: {
    userId: string
    userRole: string
    module: string
    function: string
    recordCount: number
    dataSource: string
  }
): AgentResponse<T> {
  return {
    meta: {
      state: 'ANSWER_WITH_DATA',
      timestamp: new Date().toISOString(),
      queryId: generateQueryId(),
      userId: options.userId,
      userRole: options.userRole,
      module: options.module,
      function: options.function,
      confidence: 'HIGH',
      isEstimation: false,
      dataSource: options.dataSource,
      recordCount: options.recordCount,
    },
    data,
    message: 'נתונים נמצאו במערכת', // "Data found in system"
  }
}

export function createEstimationResponse<T>(
  data: T,
  options: {
    userId: string
    userRole: string
    module: string
    function: string
    confidence: 'MEDIUM' | 'LOW'
    disclaimer: string
    dataSource: string
  }
): AgentResponse<T> {
  return {
    meta: {
      state: 'ANSWER_WITH_ESTIMATION',
      timestamp: new Date().toISOString(),
      queryId: generateQueryId(),
      userId: options.userId,
      userRole: options.userRole,
      module: options.module,
      function: options.function,
      confidence: options.confidence,
      isEstimation: true,
      estimationDisclaimer: options.disclaimer,
      dataSource: options.dataSource,
    },
    data,
    message: 'תשובה זו מבוססת על הערכה', // "This answer is based on estimation"
    hedging: options.disclaimer,
  }
}

export function createNoPermissionResponse(options: {
  userId: string
  userRole: string
  module: string
  requiredRole?: string
}): AgentResponse<null> {
  return {
    meta: {
      state: 'REFUSE_NO_PERMISSION',
      timestamp: new Date().toISOString(),
      queryId: generateQueryId(),
      userId: options.userId,
      userRole: options.userRole,
      module: options.module,
      permissionDenied: true,
    },
    data: null,
    message: 'אין לך הרשאה',
  }
}

export function createNoDataResponse(options: {
  userId: string
  userRole: string
  module: string
  function: string
  queryDescription: string
}): AgentResponse<null> {
  return {
    meta: {
      state: 'REFUSE_NO_DATA',
      timestamp: new Date().toISOString(),
      queryId: generateQueryId(),
      userId: options.userId,
      userRole: options.userRole,
      module: options.module,
      function: options.function,
      recordCount: 0,
    },
    data: null,
    message: `לא נמצאו רשומות עבור: ${options.queryDescription}. השאילתה הצליחה אך לא נמצאו תוצאות.`,
  }
}

export function createUncertainResponse(options: {
  userId: string
  userRole: string
  reason: string
}): AgentResponse<null> {
  return {
    meta: {
      state: 'REFUSE_UNCERTAIN',
      timestamp: new Date().toISOString(),
      queryId: generateQueryId(),
      userId: options.userId,
      userRole: options.userRole,
      confidence: 'LOW',
    },
    data: null,
    message: `לא ניתן לקבוע תשובה ברמת וודאות מספקת. סיבה: ${options.reason}`,
  }
}

export function createQueryFailedResponse(options: {
  userId: string
  userRole: string
  module?: string
  function?: string
  errorCode: string
  errorType: 'TIMEOUT' | 'DATABASE_ERROR' | 'INVALID_PARAMS' | 'UNKNOWN'
}): AgentResponse<null> {
  const errorMessages: Record<string, string> = {
    TIMEOUT: 'השאילתה חרגה מזמן התגובה המותר',
    DATABASE_ERROR: 'שגיאה בגישה למסד הנתונים',
    INVALID_PARAMS: 'פרמטרים לא תקינים בשאילתה',
    UNKNOWN: 'שגיאה לא צפויה בביצוע השאילתה',
  }

  return {
    meta: {
      state: 'REFUSE_QUERY_FAILED',
      timestamp: new Date().toISOString(),
      queryId: generateQueryId(),
      userId: options.userId,
      userRole: options.userRole,
      module: options.module,
      function: options.function,
      errorCode: options.errorCode,
    },
    data: null,
    message: `${errorMessages[options.errorType]} (קוד: ${options.errorCode})`,
  }
}

export function createManipulationResponse(options: {
  userId: string
  userRole: string
  attemptType: string
}): AgentResponse<null> {
  return {
    meta: {
      state: 'REFUSE_MANIPULATION',
      timestamp: new Date().toISOString(),
      queryId: generateQueryId(),
      userId: options.userId,
      userRole: options.userRole,
      manipulationDetected: true,
    },
    data: null,
    message: 'הבקשה נדחתה מסיבות אבטחה.',
  }
}

// ============================================================================
// Stage 6.3b: Deterministic Final Response States
// ============================================================================

/**
 * NOT_AUTHORIZED - All requested data was blocked by permissions.
 * Does NOT reveal which modules or functions were attempted.
 */
export function createNotAuthorizedResponse(options: {
  userId: string
  userRole: string
}): { state: 'NOT_AUTHORIZED'; message: string; httpStatus: 403 } {
  return {
    state: 'NOT_AUTHORIZED',
    message: 'אין לך הרשאה',
    httpStatus: 403,
  }
}

/**
 * PARTIAL - Some data returned, some blocked by permissions.
 * Does NOT reveal which modules were blocked.
 */
export function createPartialResponse(options: {
  userId: string
  userRole: string
  textResponse: string
}): { state: 'PARTIAL'; message: string; response: string; httpStatus: 200 } {
  return {
    state: 'PARTIAL',
    message: 'אין לך הרשאה',
    response: options.textResponse,
    httpStatus: 200,
  }
}

/**
 * NO_RESULTS - Query authorized and succeeded, but no matching records.
 */
export function createNoResultsResponse(options: {
  userId: string
  userRole: string
}): { state: 'NO_RESULTS'; message: string; httpStatus: 200 } {
  return {
    state: 'NO_RESULTS',
    message: 'לא נמצאו תוצאות בהתאם להרשאות שלך ולקריטריונים שביקשת.',
    httpStatus: 200,
  }
}

// ============================================================================
// R1: Permission vs Data Distinction
// RBAC v2 Phase 4: Database-driven Agent Permissions (DOC-016 §5, §7.1)
// AG-001: Agent is read-only forever
// AG-002: Agent uses only user READ grants
// AG-003: Agent enforces scope boundaries
// AG-004: No hardcoded matrices (INV-010, FP-009)
// AG-005: Denial message: "אין לך הרשאה מתאימה."
// ============================================================================

import type { Module, Scope } from './authorization'
import type { Session } from 'next-auth'

export interface AgentModulePermission {
  canRead: boolean
  scope: Scope | null
}

// Agent module mapping (some API modules map to different canonical modules)
// This is CONFIGURATION, not a permission matrix (AG-004 compliant)
const AGENT_MODULE_MAP: Record<string, Module> = {
  'hr': 'hr',
  'contacts': 'vendors',        // Contacts are part of vendors module
  'projects': 'projects',
  'organizations': 'vendors',   // Organizations are vendor entities
  'vehicles': 'vehicles',
  'equipment': 'equipment',
  'events': 'events',
  'reviews': 'vendors',         // Reviews are vendor-related
  'users': 'admin',
  'activityLog': 'admin',
}

/**
 * RBAC v2 Phase 4 / INV-010: Get Agent READ permissions from session
 *
 * Derives permissions ONLY from session.user.permissions (database-driven).
 * MUST NOT use role name lookup or hardcoded matrices.
 *
 * @param session - NextAuth session containing user.permissions[]
 * @returns Map of module → { canRead, scope } for READ operations only
 */
export function getAgentReadPermissions(
  session: Session | null
): Map<string, AgentModulePermission> {
  const permissions = new Map<string, AgentModulePermission>()

  // AG-004 / INV-010: Fail closed if no session or no permissions
  if (!session?.user?.permissions || !Array.isArray(session.user.permissions)) {
    return permissions
  }

  // session.user.permissions format: "module:action:scope" (e.g., "projects:READ:ALL")
  for (const permStr of session.user.permissions) {
    const parts = permStr.split(':')
    if (parts.length !== 3) continue

    const [module, action, scope] = parts

    // AG-002: Agent uses ONLY READ grants - skip all non-READ permissions
    if (action.toUpperCase() !== 'READ') continue

    // AG-003: Capture scope for boundary enforcement
    const validScope = scope as Scope

    // Store the permission (broadest scope wins if multiple exist for same module)
    const existing = permissions.get(module.toLowerCase())
    if (!existing || shouldReplaceScope(existing.scope, validScope)) {
      permissions.set(module.toLowerCase(), {
        canRead: true,
        scope: validScope,
      })
    }
  }

  return permissions
}

/**
 * Scope precedence: ALL > DOMAIN > ASSIGNED > OWN > SELF > MAIN_PAGE > CONTACTS
 * Returns true if newScope should replace existingScope (is broader)
 */
function shouldReplaceScope(existingScope: Scope | null, newScope: Scope): boolean {
  const scopePrecedence: Record<string, number> = {
    'ALL': 1,
    'DOMAIN': 2,
    'ASSIGNED': 3,
    'OWN': 4,
    'SELF': 5,
    'MAIN_PAGE': 6,
    'CONTACTS': 7,
  }

  if (!existingScope) return true
  const existingRank = scopePrecedence[existingScope] ?? 99
  const newRank = scopePrecedence[newScope] ?? 99
  return newRank < existingRank
}

/**
 * RBAC v2 Phase 4: Check if Agent has READ access to a module
 *
 * AG-001: Agent is read-only forever (only 'read' operation supported)
 * AG-002: Checks session permissions, not role names
 * AG-004: No hardcoded matrices (INV-010)
 *
 * @param session - NextAuth session
 * @param agentModule - Module name as used by Agent (e.g., 'hr', 'contacts')
 * @returns { canRead, scope } or null if no permission
 */
export function checkAgentModuleAccess(
  session: Session | null,
  agentModule: string
): AgentModulePermission | null {
  // AG-001: Agent is read-only - enforce at function level
  const agentPermissions = getAgentReadPermissions(session)

  // Map agent module to canonical module (e.g., 'contacts' → 'vendors')
  const canonicalModule = AGENT_MODULE_MAP[agentModule.toLowerCase()] || agentModule.toLowerCase()

  // Check direct match first
  let permission = agentPermissions.get(canonicalModule)

  // If no direct match and we used a mapping, try the original module name
  if (!permission && canonicalModule !== agentModule.toLowerCase()) {
    permission = agentPermissions.get(agentModule.toLowerCase())
  }

  return permission || null
}

/**
 * RBAC v2 Phase 4: Legacy-compatible hasModuleAccess wrapper
 *
 * Replaced hardcoded role-based lookup with session-based permission check.
 * AG-001: Only 'read' operation returns meaningful results
 * AG-004: No role lookup, uses session.user.permissions (INV-010)
 *
 * @param session - NextAuth session (REQUIRED - replaces role parameter)
 * @param module - Module to check
 * @param operation - Must be 'read' (AG-001: Agent is read-only)
 * @returns boolean - true if READ access granted
 */
export function hasModuleAccess(
  session: Session | null,
  module: string,
  operation: 'read' | 'write' = 'read'
): boolean {
  // AG-001: Agent is read-only forever - write operations always denied
  if (operation !== 'read') {
    return false
  }

  const permission = checkAgentModuleAccess(session, module)
  return permission?.canRead === true
}

/**
 * Get the effective scope for a module (AG-003: scope boundary enforcement)
 */
export function getAgentModuleScope(
  session: Session | null,
  agentModule: string
): Scope | null {
  const permission = checkAgentModuleAccess(session, agentModule)
  return permission?.scope || null
}

// Export module map for use in route.ts
export { AGENT_MODULE_MAP }

// ============================================================================
// R2: Guarded Analysis Helpers
// ============================================================================

export const ESTIMATION_DISCLAIMERS = {
  projection: 'הערכה זו מבוססת על נתונים היסטוריים ואינה חיזוי מדויק',
  incomplete_data: 'החישוב מבוסס על נתונים חלקיים בלבד',
  inference: 'מסקנה זו מוסקת מנתונים עקיפים',
  aggregation: 'הסיכום כולל הנחות לגבי נתונים חסרים',
  time_sensitive: 'הנתונים עשויים להשתנות מאז עדכון אחרון',
} as const

export function isEstimationRequired(functionName: string): boolean {
  const estimationFunctions = [
    'getEmployeesStats',
    'getProjectsStats',
    'getVehiclesStats',
    'getVendorRatingStats',
    'countEmployees',
    'countProjects',
    'countContacts',
  ]
  return estimationFunctions.includes(functionName)
}

export function getEstimationDisclaimer(
  functionName: string
): string | undefined {
  if (functionName.includes('Stats')) {
    return ESTIMATION_DISCLAIMERS.aggregation
  }
  if (functionName.includes('count')) {
    return ESTIMATION_DISCLAIMERS.time_sensitive
  }
  return undefined
}
