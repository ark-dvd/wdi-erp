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
    message: 'אין לי הרשאה להציג את המידע שביקשת.',
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
    message: 'בחלק מהבקשה אין לי הרשאה להציג מידע.',
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
// ============================================================================

export interface ModulePermissions {
  canRead: boolean
  canWrite: boolean
  restrictedFields?: string[]
}

/**
 * Module access permissions by role
 * R1 Requirement: Clear distinction between "no access" and "no data"
 */
export const MODULE_PERMISSIONS: Record<string, Record<string, ModulePermissions>> = {
  // ADMIN has full access to everything
  ADMIN: {
    contacts: { canRead: true, canWrite: true },
    projects: { canRead: true, canWrite: true },
    hr: { canRead: true, canWrite: true },
    organizations: { canRead: true, canWrite: true },
    vehicles: { canRead: true, canWrite: true },
    equipment: { canRead: true, canWrite: true },
    events: { canRead: true, canWrite: true },
    reviews: { canRead: true, canWrite: true },
    users: { canRead: true, canWrite: true },
    activityLog: { canRead: true, canWrite: false },
  },

  // MANAGER has read access to most, limited write
  MANAGER: {
    contacts: { canRead: true, canWrite: true },
    projects: { canRead: true, canWrite: true },
    hr: { canRead: true, canWrite: false, restrictedFields: ['salary', 'bankAccount'] },
    organizations: { canRead: true, canWrite: true },
    vehicles: { canRead: true, canWrite: true },
    equipment: { canRead: true, canWrite: true },
    events: { canRead: true, canWrite: true },
    reviews: { canRead: true, canWrite: true },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: true, canWrite: false },
  },

  // USER has limited access
  USER: {
    contacts: { canRead: true, canWrite: false },
    projects: { canRead: true, canWrite: false },
    hr: { canRead: false, canWrite: false },
    organizations: { canRead: true, canWrite: false },
    vehicles: { canRead: true, canWrite: false },
    equipment: { canRead: true, canWrite: false },
    events: { canRead: true, canWrite: false },
    reviews: { canRead: true, canWrite: false },
    users: { canRead: false, canWrite: false },
    activityLog: { canRead: false, canWrite: false },
  },
}

export function checkModulePermission(
  role: string,
  module: string,
  operation: 'read' | 'write' = 'read'
): ModulePermissions | null {
  const rolePermissions = MODULE_PERMISSIONS[role.toUpperCase()]
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
  const permission = checkModulePermission(role, module, operation)
  if (!permission) return false
  return operation === 'read' ? permission.canRead : permission.canWrite
}

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
