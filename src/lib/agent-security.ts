/**
 * Stage 6.3 Remediation: Agent Security Framework
 *
 * R3: Anti-Manipulation Detection
 *
 * This module detects and logs attempts to manipulate the Agent into
 * bypassing safety controls, fabricating data, or escalating privileges.
 */

import { logActivity, logAgentQuery } from './activity'

// ============================================================================
// Manipulation Pattern Definitions
// ============================================================================

export type ManipulationCategory =
  | 'PRIVILEGE_ESCALATION'
  | 'PROMPT_INJECTION'
  | 'DATA_FABRICATION'
  | 'SAFETY_BYPASS'
  | 'CONTEXT_MANIPULATION'
  | 'IDENTITY_SPOOFING'

export interface ManipulationPattern {
  id: string
  category: ManipulationCategory
  patterns: RegExp[]
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  description: string
}

const MANIPULATION_PATTERNS: ManipulationPattern[] = [
  // Privilege escalation attempts
  {
    id: 'MANIP-001',
    category: 'PRIVILEGE_ESCALATION',
    patterns: [
      /(?:pretend|act|behave)\s+(?:as|like)\s+(?:admin|administrator|manager)/i,
      /(?:ignore|skip|bypass)\s+(?:permission|role|access)\s+check/i,
      /(?:you\s+are|i\s+am)\s+(?:admin|administrator)/i,
      /(?:grant|give)\s+(?:me|yourself)\s+(?:admin|full)\s+access/i,
    ],
    severity: 'CRITICAL',
    description: 'Attempt to escalate privileges beyond user role',
  },

  // Prompt injection attempts
  {
    id: 'MANIP-002',
    category: 'PROMPT_INJECTION',
    patterns: [
      /(?:ignore|forget|disregard)\s+(?:previous|all|your)\s+instructions/i,
      /(?:new\s+)?system\s+(?:prompt|instruction|role)/i,
      /\[SYSTEM\]|\[ADMIN\]|\[OVERRIDE\]/i,
      /(?:from\s+now\s+on|starting\s+now),?\s+you\s+(?:are|will|must)/i,
    ],
    severity: 'CRITICAL',
    description: 'Attempt to inject new instructions or override system prompt',
  },

  // Data fabrication requests
  {
    id: 'MANIP-003',
    category: 'DATA_FABRICATION',
    patterns: [
      /(?:make\s+up|invent|create|fabricate)\s+(?:data|numbers|records)/i,
      /(?:just|simply)\s+(?:guess|estimate|assume)\s+(?:the|a)\s+(?:number|value)/i,
      /(?:pretend|assume)\s+(?:there\s+are|we\s+have)\s+\d+/i,
      /(?:generate|create)\s+(?:fake|dummy|placeholder)\s+(?:data|records)/i,
    ],
    severity: 'HIGH',
    description: 'Attempt to make agent fabricate data',
  },

  // Safety bypass attempts
  {
    id: 'MANIP-004',
    category: 'SAFETY_BYPASS',
    patterns: [
      /(?:skip|ignore|disable)\s+(?:safety|security|validation)/i,
      /(?:don't|do\s+not)\s+(?:check|verify|validate)/i,
      /(?:bypass|circumvent|avoid)\s+(?:the\s+)?(?:filter|check|guard)/i,
      /(?:turn\s+off|disable)\s+(?:protection|safeguard)/i,
    ],
    severity: 'HIGH',
    description: 'Attempt to bypass safety controls',
  },

  // Context manipulation
  {
    id: 'MANIP-005',
    category: 'CONTEXT_MANIPULATION',
    patterns: [
      /(?:this\s+is\s+a|we're\s+in)\s+(?:test|debug|dev)\s+(?:mode|environment)/i,
      /(?:for\s+testing|debug)\s+purposes?\s+only/i,
      /(?:in\s+production|real\s+world)\s+you\s+(?:would|should)/i,
      /(?:pretend|imagine)\s+(?:this\s+is|we're\s+in)/i,
    ],
    severity: 'MEDIUM',
    description: 'Attempt to manipulate context to alter behavior',
  },

  // Identity spoofing
  {
    id: 'MANIP-006',
    category: 'IDENTITY_SPOOFING',
    patterns: [
      /(?:i\s+am|this\s+is)\s+(?:the\s+)?(?:ceo|cto|owner|admin|system)/i,
      /(?:on\s+behalf\s+of|acting\s+for)\s+(?:admin|manager)/i,
      /(?:my\s+boss|manager)\s+(?:said|told\s+me)\s+(?:to|you\s+should)/i,
      /(?:authorized|approved)\s+by\s+(?:management|admin)/i,
    ],
    severity: 'HIGH',
    description: 'Attempt to spoof identity or authority',
  },

  // Hebrew manipulation patterns
  {
    id: 'MANIP-007',
    category: 'PROMPT_INJECTION',
    patterns: [
      /(?:התעלם|שכח|התעלמי)\s+(?:מהוראות|מההוראות)/,
      /(?:אתה|את)\s+(?:עכשיו|מעתה)\s+(?:אדמין|מנהל)/,
      /(?:דמיין|נניח)\s+(?:שאתה|שיש\s+לך)/,
      /(?:בדוק|תבדוק)\s+בלי\s+(?:הרשאות|אימות)/,
    ],
    severity: 'HIGH',
    description: 'Hebrew prompt injection attempt',
  },

  // SQL/Code injection attempts in queries
  {
    id: 'MANIP-008',
    category: 'SAFETY_BYPASS',
    patterns: [
      /(?:SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE)\s+/i,
      /(?:--|;|\/\*|\*\/)/,
      /(?:OR\s+1\s*=\s*1|AND\s+1\s*=\s*1)/i,
      /(?:UNION\s+SELECT|INTO\s+OUTFILE)/i,
    ],
    severity: 'CRITICAL',
    description: 'Possible SQL injection attempt',
  },
]

// ============================================================================
// Detection Functions
// ============================================================================

export interface ManipulationDetectionResult {
  detected: boolean
  matches: Array<{
    patternId: string
    category: ManipulationCategory
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
    matchedText: string
    description: string
  }>
  highestSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM'
}

/**
 * Scan user input for manipulation patterns
 * R3 Requirement: Detect attempts to bypass safety
 */
export function detectManipulation(input: string): ManipulationDetectionResult {
  const matches: ManipulationDetectionResult['matches'] = []

  for (const pattern of MANIPULATION_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = input.match(regex)
      if (match) {
        matches.push({
          patternId: pattern.id,
          category: pattern.category,
          severity: pattern.severity,
          matchedText: match[0],
          description: pattern.description,
        })
        break // Only count each pattern once per input
      }
    }
  }

  const severityOrder = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 }
  const highestSeverity = matches.length > 0
    ? matches.reduce((highest, m) =>
        severityOrder[m.severity] > severityOrder[highest.severity] ? m : highest
      ).severity
    : undefined

  return {
    detected: matches.length > 0,
    matches,
    highestSeverity,
  }
}

/**
 * Log manipulation attempt to activity log
 * R3 Requirement: Log bypass attempts with full context
 */
export async function logManipulationAttempt(
  userId: string,
  userEmail: string,
  userRole: string,
  input: string,
  detection: ManipulationDetectionResult
): Promise<void> {
  if (!detection.detected) return

  await logActivity({
    action: 'AGENT_MANIPULATION_DETECTED',
    category: 'SECURITY',
    module: 'Agent',
    userId,
    userEmail,
    userRole,
    details: JSON.stringify({
      input: input.substring(0, 500), // Truncate long inputs
      matches: detection.matches,
      highestSeverity: detection.highestSeverity,
      timestamp: new Date().toISOString(),
    }),
    targetType: 'SECURITY_EVENT',
    targetId: `MANIP-${Date.now()}`,
    targetName: `Manipulation attempt: ${detection.matches[0]?.category}`,
  })
}

// ============================================================================
// Rate Limiting & Abuse Detection
// ============================================================================

interface UserQueryHistory {
  queries: Array<{ timestamp: number; input: string }>
  manipulationAttempts: number
  lastManipulationTime?: number
}

const userQueryHistory = new Map<string, UserQueryHistory>()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const MAX_QUERIES_PER_WINDOW = 30
const MAX_MANIPULATION_ATTEMPTS = 3
const MANIPULATION_COOLDOWN_MS = 300000 // 5 minutes

export interface RateLimitResult {
  allowed: boolean
  reason?: 'RATE_LIMITED' | 'MANIPULATION_BLOCKED'
  remainingQueries?: number
  resetTime?: number
}

/**
 * Check if user is rate limited or blocked due to manipulation
 */
export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now()
  let history = userQueryHistory.get(userId)

  if (!history) {
    history = { queries: [], manipulationAttempts: 0 }
    userQueryHistory.set(userId, history)
  }

  // Check manipulation cooldown
  if (
    history.manipulationAttempts >= MAX_MANIPULATION_ATTEMPTS &&
    history.lastManipulationTime &&
    now - history.lastManipulationTime < MANIPULATION_COOLDOWN_MS
  ) {
    return {
      allowed: false,
      reason: 'MANIPULATION_BLOCKED',
      resetTime: history.lastManipulationTime + MANIPULATION_COOLDOWN_MS,
    }
  }

  // Reset manipulation count after cooldown
  if (
    history.lastManipulationTime &&
    now - history.lastManipulationTime >= MANIPULATION_COOLDOWN_MS
  ) {
    history.manipulationAttempts = 0
  }

  // Filter to queries within window
  history.queries = history.queries.filter(
    (q) => now - q.timestamp < RATE_LIMIT_WINDOW_MS
  )

  if (history.queries.length >= MAX_QUERIES_PER_WINDOW) {
    return {
      allowed: false,
      reason: 'RATE_LIMITED',
      remainingQueries: 0,
      resetTime: history.queries[0].timestamp + RATE_LIMIT_WINDOW_MS,
    }
  }

  return {
    allowed: true,
    remainingQueries: MAX_QUERIES_PER_WINDOW - history.queries.length,
  }
}

/**
 * Record a query in user history
 */
export function recordQuery(userId: string, input: string): void {
  let history = userQueryHistory.get(userId)
  if (!history) {
    history = { queries: [], manipulationAttempts: 0 }
    userQueryHistory.set(userId, history)
  }

  history.queries.push({ timestamp: Date.now(), input })
}

/**
 * Record a manipulation attempt
 */
export function recordManipulationAttempt(userId: string): void {
  let history = userQueryHistory.get(userId)
  if (!history) {
    history = { queries: [], manipulationAttempts: 0 }
    userQueryHistory.set(userId, history)
  }

  history.manipulationAttempts++
  history.lastManipulationTime = Date.now()
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Sanitize user input before processing
 * Removes potentially dangerous patterns while preserving query intent
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '')

  // Remove control characters except newlines
  sanitized = sanitized.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '')

  // Normalize unicode to prevent homograph attacks
  sanitized = sanitized.normalize('NFKC')

  // Limit length
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000)
  }

  return sanitized.trim()
}

// ============================================================================
// Security Context
// ============================================================================

export interface SecurityContext {
  userId: string
  userEmail: string
  userRole: string
  clientIp?: string
  userAgent?: string
  requestId: string
  timestamp: string
}

export function createSecurityContext(
  userId: string,
  userEmail: string,
  userRole: string,
  request?: Request
): SecurityContext {
  return {
    userId,
    userEmail,
    userRole,
    clientIp: request?.headers?.get('x-forwarded-for') || undefined,
    userAgent: request?.headers?.get('user-agent') || undefined,
    requestId: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  }
}
