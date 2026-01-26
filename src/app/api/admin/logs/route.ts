import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAdminAccess } from '@/lib/authorization'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC v1: Check admin authorization (with fallback) - DOC-013 §10.2
    if (!checkAdminAccess(session)) {
      return NextResponse.json({ error: 'אין הרשאה לצפות בלוגים' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const userEmail = searchParams.get('userEmail')
    const action = searchParams.get('action')
    const module = searchParams.get('module')
    const category = searchParams.get('category')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const search = searchParams.get('search')
    
    const where: any = {}
    
    if (userEmail) where.userEmail = userEmail
    if (action) where.action = action
    if (module) where.module = module
    if (category) where.category = category
    
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }
    
    if (search) {
      where.OR = [
        { targetName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { path: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              image: true,
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                  photoUrl: true
                }
              }
            }
          }
        }
      }),
      prisma.activityLog.count({ where })
    ])
    
    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Admin logs API error:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
