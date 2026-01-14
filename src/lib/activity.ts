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

export type ActivityCategory = 'auth' | 'navigation' | 'data' | 'search' | 'files' | 'agent' | 'system'

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
  action: ActivityAction
  category: ActivityCategory
  module?: ActivityModule
  path?: string
  targetType?: string
  targetId?: string
  targetName?: string
  details?: Record<string, any>
  duration?: number
  success?: boolean
  userEmail?: string
}

export async function logActivity(params: ActivityParams) {
  try {
    const session = await auth()
    const headersList = await headers()
    
    const userEmail = params.userEmail || session?.user?.email
    if (!userEmail) {
      return
    }
    
    await prisma.activityLog.create({
      data: {
        userId: (session?.user as any)?.id || null,
        userEmail: userEmail,
        userRole: (session?.user as any)?.role?.name || null,
        action: params.action,
        category: params.category,
        module: params.module || null,
        path: params.path || null,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        targetName: params.targetName || null,
        details: params.details ?? undefined,
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
