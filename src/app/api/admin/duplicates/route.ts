// ================================================
// WDI ERP - Admin Duplicates API
// Version: 20260202-RBAC-V2-PHASE3
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v2 / DOC-016 §6.1: Operation-specific permission check
    const denied = await requirePermission(session, 'admin', 'read')
    if (denied) return denied

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
