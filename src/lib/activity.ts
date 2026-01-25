// Version: 20260114-225500
// Added: equipment to ActivityModule
import { prisma } from './prisma'
import { auth } from './auth'
import { headers } from 'next/headers'

export type ActivityAction =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAIL' | 'LOGOUT'
  | 'PAGE_VIEW'
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  | 'SEARCH' | 'FILTER'
  | 'UPLOAD' | 'DOWNLOAD' | 'DELETE_FILE'
  | 'QUERY'
  | 'EXPORT'
  // Stage 6.3: Security actions
  | 'AGENT_MANIPULATION_DETECTED'
  | 'AGENT_PERMISSION_DENIED'
  | 'AGENT_RATE_LIMITED'

export type ActivityCategory = 'auth' | 'navigation' | 'data' | 'search' | 'files' | 'agent' | 'system' | 'SECURITY'

export type ActivityModule = 
  | 'hr' 
  | 'projects' 
  | 'events' 
  | 'contacts' 
  | 'organizations'
  | 'vehicles'
  | 'equipment'
  | 'vendor-rating' 
  | 'agent' 
  | 'admin' 
  | 'settings' 
  | 'files' 
  | 'auth'

interface ActivityParams {
  action: ActivityAction | string // Allow string for security actions
  category: ActivityCategory | string // Allow string for SECURITY
  module?: ActivityModule | string
  path?: string
  targetType?: string
  targetId?: string
  targetName?: string
  details?: Record<string, any> | string // Allow string for JSON
  duration?: number
  success?: boolean
  userEmail?: string
  // Stage 6.3: Direct user context (for security logging without session)
  userId?: string
  userRole?: string
}

export async function logActivity(params: ActivityParams) {
  try {
    const session = await auth()
    const headersList = await headers()

    // Stage 6.3: Support direct user context for security logging
    const userId = params.userId || (session?.user as any)?.id || null
    const userEmail = params.userEmail || session?.user?.email
    const userRole = params.userRole || (session?.user as any)?.role?.name || null

    if (!userEmail) {
      return
    }

    // Handle details as string (JSON) or object
    const details = typeof params.details === 'string'
      ? JSON.parse(params.details)
      : params.details

    await prisma.activityLog.create({
      data: {
        userId,
        userEmail: userEmail,
        userRole,
        action: params.action,
        category: params.category,
        module: params.module || null,
        path: params.path || null,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        targetName: params.targetName || null,
        details: details ?? undefined,
        duration: params.duration || null,
        success: params.success ?? true,
        ip: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null,
        userAgent: headersList.get('user-agent') || null,
      }
    })
  } catch (error) {
    console.error('Activity log error:', error)
  }
}

export async function logCrud(
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  module: ActivityModule,
  targetType: string,
  targetId: string,
  targetName: string,
  details?: Record<string, any>
) {
  await logActivity({
    action,
    category: 'data',
    module,
    targetType,
    targetId,
    targetName,
    details
  })
}

export async function logAgentQuery(
  question: string,
  answer: string,
  duration: number,
  success: boolean = true
) {
  await logActivity({
    action: 'QUERY',
    category: 'agent',
    module: 'agent',
    details: {
      question,
      answer: answer.substring(0, 2000),
      fullAnswerLength: answer.length
    },
    duration,
    success
  })
}

// ============================================================================
// Stage 6.3 R4: ActivityLog Query Functions for Agent
// ============================================================================

export interface ActivityLogQueryParams {
  userId?: string
  userEmail?: string
  action?: ActivityAction | string
  category?: ActivityCategory | string
  module?: ActivityModule | string
  targetType?: string
  targetId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface ActivityLogEntry {
  id: string
  timestamp: Date
  userId: string | null
  userEmail: string
  userRole: string | null
  action: string
  category: string
  module: string | null
  path: string | null
  targetType: string | null
  targetId: string | null
  targetName: string | null
  details: any
  duration: number | null
  success: boolean
}

/**
 * Query activity logs - only available to ADMIN and MANAGER roles
 * R4 Requirement: Agent must be able to query ActivityLog for explanations
 */
export async function queryActivityLogs(
  params: ActivityLogQueryParams
): Promise<ActivityLogEntry[]> {
  const where: any = {}

  if (params.userId) where.userId = params.userId
  if (params.userEmail) where.userEmail = { contains: params.userEmail, mode: 'insensitive' }
  if (params.action) where.action = params.action
  if (params.category) where.category = params.category
  if (params.module) where.module = params.module
  if (params.targetType) where.targetType = params.targetType
  if (params.targetId) where.targetId = params.targetId

  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) where.createdAt.gte = params.startDate
    if (params.endDate) where.createdAt.lte = params.endDate
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit || 50,
    skip: params.offset || 0,
  })

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.createdAt,
    userId: log.userId,
    userEmail: log.userEmail,
    userRole: log.userRole,
    action: log.action,
    category: log.category,
    module: log.module,
    path: log.path,
    targetType: log.targetType,
    targetId: log.targetId,
    targetName: log.targetName,
    details: log.details,
    duration: log.duration,
    success: log.success ?? true,
  }))
}

/**
 * Get activity log summary statistics
 */
export async function getActivityLogStats(params: {
  startDate?: Date
  endDate?: Date
}): Promise<{
  totalActions: number
  byCategory: Record<string, number>
  byModule: Record<string, number>
  byUser: Array<{ email: string; count: number }>
  mostActiveHours: Array<{ hour: number; count: number }>
}> {
  const where: any = {}
  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) where.createdAt.gte = params.startDate
    if (params.endDate) where.createdAt.lte = params.endDate
  }

  const [total, byCategory, byModule, byUser] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.groupBy({
      by: ['category'],
      where,
      _count: { _all: true },
    }),
    prisma.activityLog.groupBy({
      by: ['module'],
      where,
      _count: { _all: true },
    }),
    prisma.activityLog.groupBy({
      by: ['userEmail'],
      where,
      _count: { _all: true },
      orderBy: { _count: { userEmail: 'desc' } },
      take: 10,
    }),
  ])

  return {
    totalActions: total,
    byCategory: Object.fromEntries(
      byCategory.map((c) => [c.category, c._count._all])
    ),
    byModule: Object.fromEntries(
      byModule.filter((m) => m.module).map((m) => [m.module!, m._count._all])
    ),
    byUser: byUser.map((u) => ({ email: u.userEmail, count: u._count._all })),
    mostActiveHours: [], // Would require raw SQL for hour extraction
  }
}

/**
 * Get timeline of changes for a specific entity
 * R4 Requirement: Agent can timeline events for an entity
 */
export async function getEntityTimeline(
  targetType: string,
  targetId: string,
  limit: number = 20
): Promise<ActivityLogEntry[]> {
  const logs = await prisma.activityLog.findMany({
    where: {
      targetType,
      targetId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.createdAt,
    userId: log.userId,
    userEmail: log.userEmail,
    userRole: log.userRole,
    action: log.action,
    category: log.category,
    module: log.module,
    path: log.path,
    targetType: log.targetType,
    targetId: log.targetId,
    targetName: log.targetName,
    details: log.details,
    duration: log.duration,
    success: log.success ?? true,
  }))
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(
  userEmail: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalActions: number
  actionBreakdown: Record<string, number>
  moduleBreakdown: Record<string, number>
  recentActions: ActivityLogEntry[]
}> {
  const where: any = { userEmail }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const [total, byAction, byModule, recent] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.groupBy({
      by: ['action'],
      where,
      _count: { _all: true },
    }),
    prisma.activityLog.groupBy({
      by: ['module'],
      where,
      _count: { _all: true },
    }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return {
    totalActions: total,
    actionBreakdown: Object.fromEntries(
      byAction.map((a) => [a.action, a._count._all])
    ),
    moduleBreakdown: Object.fromEntries(
      byModule.filter((m) => m.module).map((m) => [m.module!, m._count._all])
    ),
    recentActions: recent.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      userId: log.userId,
      userEmail: log.userEmail,
      userRole: log.userRole,
      action: log.action,
      category: log.category,
      module: log.module,
      path: log.path,
      targetType: log.targetType,
      targetId: log.targetId,
      targetName: log.targetName,
      details: log.details,
      duration: log.duration,
      success: log.success ?? true,
    })),
  }
}

/**
 * Get security events (manipulation attempts, rate limits, etc.)
 */
export async function getSecurityEvents(
  startDate?: Date,
  endDate?: Date,
  limit: number = 50
): Promise<ActivityLogEntry[]> {
  const where: any = {
    OR: [
      { action: 'AGENT_MANIPULATION_DETECTED' },
      { action: 'AGENT_PERMISSION_DENIED' },
      { action: 'AGENT_RATE_LIMITED' },
      { category: 'SECURITY' },
    ],
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.createdAt,
    userId: log.userId,
    userEmail: log.userEmail,
    userRole: log.userRole,
    action: log.action,
    category: log.category,
    module: log.module,
    path: log.path,
    targetType: log.targetType,
    targetId: log.targetId,
    targetName: log.targetName,
    details: log.details,
    duration: log.duration,
    success: log.success ?? true,
  }))
}
