import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const data = await request.json()
    const headersList = await headers()
    
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id || null,
        userEmail: session.user.email,
        userRole: (session.user as any)?.role?.name || null,
        action: data.action,
        category: data.category,
        module: data.module || null,
        path: data.path || null,
        targetType: data.targetType || null,
        targetId: data.targetId || null,
        targetName: data.targetName || null,
        details: data.details || null,
        duration: data.duration || null,
        success: data.success ?? true,
        ip: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null,
        userAgent: headersList.get('user-agent') || null,
      }
    })
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Activity API error:', error)
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}
