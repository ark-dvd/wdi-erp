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
    message: `אין לך הרשאה לצפות בנתוני ${options.module}. תפקידך: ${options.userRole}${options.requiredRole ? `. נדרש: ${options.requiredRole}` : ''}`,
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
    message: 'אין לך הרשאה מתאימה.',  // DOC-013 §8.2
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
    message: 'בחלק מהבקשה אין לך הרשאה להציג מידע.',  // DOC-013 §8.2
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
// RBAC v2: Uses canonical roles from DOC-013 v2.0
// DOC-013 A-001: Agent can access exactly the data the user has READ permission for
// HR access per role follows DOC-013 §7 permission matrix
// ============================================================================

import type { CanonicalRole, Module } from './authorization'

export interface ModulePermissions {
  canRead: boolean
  canWrite: boolean
  restrictedFields?: string[]
}

// Agent module mapping (some API modules map to different canonical modules)
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
 * RBAC v2 Module Permissions by Canonical Role
 * Source: DOC-013 v2.0 §7 Role Permission Matrix
 *
 * DOC-013 A-001: Agent can access exactly the data the user has READ permission for.
 * Agent is READ-ONLY (canWrite: false for all modules).
 * HR access follows DOC-013 §7 role-specific permissions.
 */
const AGENT_MODULE_PERMISSIONS: Record<CanonicalRole, Record<string, ModulePermissions>> = {
  // Owner: Full read access to all modules (DOC-013 §7.3)
  // WDI Agent: "✅ All data"
  owner: {
    contacts: { canRead: true, canWrite: false },
    projects: { canRead: true, canWrite: false },
    hr: { canRead: true, canWrite: false },  // DOC-013 §7.3: כח אדם ✅
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },
    equipment: { canRead: true, canWrite: false },
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: false },
    users: { canRead: true, canWrite: false },
    activityLog: { canRead: true, canWrite: false },
  },

  // Executive: Full read access to all modules (DOC-013 §7.4)
  // WDI Agent: "✅ Per read permissions"
  executive: {
    contacts: { canRead: true, canWrite: false },
    projects: { canRead: true, canWrite: false },
    hr: { canRead: true, canWrite: false },  // DOC-013 §7.4: כח אדם ✅
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },
    equipment: { canRead: true, canWrite: false },
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: false },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: true, canWrite: false },
  },

  // Trust Officer: Full HR read access (DOC-013 §7.5)
  // WDI Agent: "✅ Per read permissions"
  trust_officer: {
    contacts: { canRead: true, canWrite: false },
    projects: { canRead: true, canWrite: false },
    hr: { canRead: true, canWrite: false },  // DOC-013 §7.5: כח אדם ✅
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },
    equipment: { canRead: true, canWrite: false },
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: false },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: true, canWrite: false },
  },

  // Finance Officer: Full HR read access (DOC-013 §7.7)
  // WDI Agent: "✅ Per read permissions"
  finance_officer: {
    contacts: { canRead: true, canWrite: false },
    projects: { canRead: true, canWrite: false },
    hr: { canRead: true, canWrite: false },  // DOC-013 §7.7: כח אדם ✅
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },
    equipment: { canRead: true, canWrite: false },
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: false },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: false, canWrite: false },
  },

  // Domain Head: Domain-scoped access (DOC-013 §7.8)
  // HR: "⚠️ Main page only" - Agent can't enforce MAIN_PAGE scope
  domain_head: {
    contacts: { canRead: true, canWrite: false },
    projects: { canRead: true, canWrite: false },  // DOMAIN scope applied server-side
    hr: { canRead: false, canWrite: false },  // DOC-013 §7.8: MAIN_PAGE scope only - Agent can't enforce
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },
    equipment: { canRead: true, canWrite: false },
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: false },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: false, canWrite: false },
  },

  // PMO: Cross-project visibility (DOC-013 §7.6)
  // HR: "⚠️ Main page + own card" - Agent can't enforce SELF scope
  pmo: {
    contacts: { canRead: true, canWrite: true },
    projects: { canRead: true, canWrite: false },
    hr: { canRead: false, canWrite: false },  // DOC-013 §7.6: MAIN_PAGE + SELF - Agent can't enforce
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },  // OWN scope
    equipment: { canRead: true, canWrite: false },  // OWN scope
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: true },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: false, canWrite: false },
  },

  // Project Manager: Assigned projects (DOC-013 §7.9)
  // HR: "⚠️ Main page + own card" - Agent can't enforce SELF scope
  project_manager: {
    contacts: { canRead: true, canWrite: true },
    projects: { canRead: true, canWrite: false },  // ASSIGNED scope applied server-side
    hr: { canRead: false, canWrite: false },  // DOC-013 §7.9: MAIN_PAGE + SELF - Agent can't enforce
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },  // OWN scope
    equipment: { canRead: true, canWrite: false },  // OWN scope
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: true },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: false, canWrite: false },
  },

  // Project Coordinator: Project-scoped access (DOC-013 §7.10)
  // HR: "⚠️ Own card only" - Agent can't enforce SELF scope
  project_coordinator: {
    contacts: { canRead: true, canWrite: false },
    projects: { canRead: true, canWrite: false },
    hr: { canRead: false, canWrite: false },  // DOC-013 §7.10: SELF only - Agent can't enforce
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },
    equipment: { canRead: true, canWrite: false },
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: false },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: false, canWrite: false },
  },

  // Administration: Equipment/vehicles/vendors/contacts (DOC-013 §7.11)
  // HR: "⚠️ Contacts scope" - Agent can't enforce CONTACTS scope
  administration: {
    contacts: { canRead: true, canWrite: true },
    projects: { canRead: true, canWrite: false },  // CONTACTS scope only
    hr: { canRead: false, canWrite: false },  // DOC-013 §7.11: CONTACTS scope - Agent can't enforce
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: true },
    equipment: { canRead: true, canWrite: true },
    events: { canRead: false, canWrite: false },
    reviews: { canRead: true, canWrite: true },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: false, canWrite: false },
  },

  // All Employees: Baseline access (DOC-013 §7.12)
  // HR: "⚠️ Own card only" - Agent can't enforce SELF scope
  all_employees: {
    contacts: { canRead: true, canWrite: false },
    projects: { canRead: true, canWrite: false },
    hr: { canRead: false, canWrite: false },  // DOC-013 §7.12: SELF only - Agent can't enforce
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },
    equipment: { canRead: true, canWrite: false },
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: false },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: false, canWrite: false },
  },
}

// Legacy compatibility: Map old role names to RBAC v2 canonical roles
const LEGACY_ROLE_MAP: Record<string, CanonicalRole> = {
  'ADMIN': 'owner',
  'MANAGER': 'trust_officer',
  'USER': 'all_employees',
  'founder': 'owner',
  'ceo': 'executive',
  'office_manager': 'trust_officer',
  'department_manager': 'domain_head',
  'senior_pm': 'project_manager',        // v1→v2 rename
  'operations_staff': 'administration',  // v1→v2 rename
  'secretary': 'administration',
  'employee': 'all_employees',
}

/**
 * Normalize role name to canonical format
 */
function normalizeRole(role: string): CanonicalRole {
  const normalized = role.toLowerCase()

  // Check if already canonical
  if (normalized in AGENT_MODULE_PERMISSIONS) {
    return normalized as CanonicalRole
  }

  // Check legacy mapping
  const legacy = LEGACY_ROLE_MAP[role] || LEGACY_ROLE_MAP[role.toUpperCase()]
  if (legacy) {
    return legacy
  }

  // Default to all_employees (safe baseline)
  return 'all_employees'
}

export function checkModulePermission(
  role: string,
  module: string,
  operation: 'read' | 'write' = 'read'
): ModulePermissions | null {
  const canonicalRole = normalizeRole(role)
  const rolePermissions = AGENT_MODULE_PERMISSIONS[canonicalRole]

  if (!rolePermissions) {
    return null
  }

  const modulePermission = rolePermissions[module.toLowerCase()]
  if (!modulePermission) {
    return null
  }

  return modulePermission
}

export function hasModuleAccess(
  role: string,
  module: string,
  operation: 'read' | 'write' = 'read'
): boolean {
  // DOC-013 A-001: Agent can access exactly the data the user has READ permission for
  // HR access is determined by AGENT_MODULE_PERMISSIONS per role (not hardcoded)
  const permission = checkModulePermission(role, module, operation)
  if (!permission) return false
  return operation === 'read' ? permission.canRead : permission.canWrite
}

// Export for use in authorization module
export { AGENT_MODULE_PERMISSIONS, AGENT_MODULE_MAP }

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
