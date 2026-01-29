// /home/user/wdi-erp/src/app/api/admin/duplicates/route.ts
// Version: 20260125-RBAC-V1
// API for listing duplicate sets

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAdminAccess } from '@/lib/authorization'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v1: Check admin authorization (with fallback) - DOC-013 §10.2
    if (!checkAdminAccess(session)) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const entityType = searchParams.get('entityType')

    const where: any = {}
    
    if (status !== 'all') {
      where.status = status
    }
    
    if (entityType) {
      where.entityType = entityType
    }

    const duplicateSets = await prisma.duplicateSet.findMany({
      where,
      orderBy: [
        { score: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        reviewedBy: {
          select: { name: true, employee: { select: { firstName: true, lastName: true } } }
        }
      }
    })

    // הוספת שמות הרשומות
    const enrichedSets = await Promise.all(
      duplicateSets.map(async (set) => {
        let primaryName = ''
        let secondaryName = ''

        if (set.entityType === 'organization') {
          const [primary, secondary] = await Promise.all([
            prisma.organization.findUnique({ 
              where: { id: set.primaryId }, 
              select: { name: true } 
            }),
            prisma.organization.findUnique({ 
              where: { id: set.secondaryId }, 
              select: { name: true } 
            }),
          ])
          primaryName = primary?.name || '[נמחק]'
          secondaryName = secondary?.name || '[נמחק]'
        } else {
          const [primary, secondary] = await Promise.all([
            prisma.contact.findUnique({ 
              where: { id: set.primaryId }, 
              select: { firstName: true, lastName: true } 
            }),
            prisma.contact.findUnique({ 
              where: { id: set.secondaryId }, 
              select: { firstName: true, lastName: true } 
            }),
          ])
          primaryName = primary ? `${primary.firstName} ${primary.lastName}` : '[נמחק]'
          secondaryName = secondary ? `${secondary.firstName} ${secondary.lastName}` : '[נמחק]'
        }

        return {
          ...set,
          primaryName,
          secondaryName,
        }
      })
    )

    // סטטיסטיקות
    const stats = await prisma.duplicateSet.groupBy({
      by: ['status'],
      _count: true
    })

    return NextResponse.json({
      duplicates: enrichedSets,
      stats: stats.reduce((acc, s) => {
        acc[s.status] = s._count
        return acc
      }, {} as Record<string, number>)
    })

  } catch (error) {
    console.error('Error fetching duplicates:', error)
    return NextResponse.json({ error: 'שגיאה בשליפת כפילויות' }, { status: 500 })
  }
}
