// /home/user/wdi-erp/src/app/api/admin/duplicates/[id]/route.ts
// Version: 20260114-191000
// API for single duplicate set details and status update

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== 'founder') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }

    const duplicateSet = await prisma.duplicateSet.findUnique({
      where: { id },
      include: {
        reviewedBy: {
          select: { name: true, employee: { select: { firstName: true, lastName: true } } }
        }
      }
    })

    if (!duplicateSet) {
      return NextResponse.json({ error: 'כפילות לא נמצאה' }, { status: 404 })
    }

    // שליפת פרטים מלאים של שתי הרשומות
    let primary: any = null
    let secondary: any = null

    if (duplicateSet.entityType === 'organization') {
      [primary, secondary] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: duplicateSet.primaryId },
          include: {
            contacts: {
              select: { id: true, firstName: true, lastName: true, role: true }
            },
            _count: {
              select: { contacts: true }
            }
          }
        }),
        prisma.organization.findUnique({
          where: { id: duplicateSet.secondaryId },
          include: {
            contacts: {
              select: { id: true, firstName: true, lastName: true, role: true }
            },
            _count: {
              select: { contacts: true }
            }
          }
        }),
      ])
    } else {
      [primary, secondary] = await Promise.all([
        prisma.contact.findUnique({
          where: { id: duplicateSet.primaryId },
          include: {
            organization: { select: { id: true, name: true } },
            projects: {
              include: {
                project: { select: { id: true, name: true, projectNumber: true } }
              }
            },
            _count: {
              select: { individualReviews: true, projects: true }
            }
          }
        }),
        prisma.contact.findUnique({
          where: { id: duplicateSet.secondaryId },
          include: {
            organization: { select: { id: true, name: true } },
            projects: {
              include: {
                project: { select: { id: true, name: true, projectNumber: true } }
              }
            },
            _count: {
              select: { individualReviews: true, projects: true }
            }
          }
        }),
      ])
    }

    // זיהוי שדות עם קונפליקטים
    const conflicts = identifyConflicts(duplicateSet.entityType, primary, secondary)

    return NextResponse.json({
      duplicateSet,
      primary,
      secondary,
      conflicts,
    })

  } catch (error) {
    console.error('Error fetching duplicate:', error)
    return NextResponse.json({ error: 'שגיאה בשליפת פרטי כפילות' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== 'founder') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const { status } = await request.json()

    if (!['pending', 'rejected', 'skipped'].includes(status)) {
      return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 })
    }

    const duplicateSet = await prisma.duplicateSet.update({
      where: { id },
      data: {
        status,
        reviewedById: userId,
        reviewedAt: new Date(),
      }
    })

    await logActivity({
      action: 'UPDATE',
      category: 'data',
      module: 'admin',
      targetType: 'duplicate_set',
      targetId: id,
      details: { status }
    })

    return NextResponse.json(duplicateSet)

  } catch (error) {
    console.error('Error updating duplicate:', error)
    return NextResponse.json({ error: 'שגיאה בעדכון' }, { status: 500 })
  }
}

interface ConflictField {
  field: string
  label: string
  primaryValue: any
  secondaryValue: any
  type: 'text' | 'array' | 'date' | 'number'
}

function identifyConflicts(
  entityType: string, 
  primary: any, 
  secondary: any
): ConflictField[] {
  if (!primary || !secondary) return []

  const conflicts: ConflictField[] = []

  if (entityType === 'organization') {
    const orgFields = [
      { field: 'name', label: 'שם', type: 'text' as const },
      { field: 'type', label: 'סוג', type: 'text' as const },
      { field: 'phone', label: 'טלפון', type: 'text' as const },
      { field: 'email', label: 'אימייל', type: 'text' as const },
      { field: 'website', label: 'אתר', type: 'text' as const },
      { field: 'address', label: 'כתובת', type: 'text' as const },
      { field: 'businessId', label: 'ח.פ.', type: 'text' as const },
      { field: 'notes', label: 'הערות', type: 'text' as const },
      { field: 'contactTypes', label: 'סוגי קשר', type: 'array' as const },
      { field: 'disciplines', label: 'דיסציפלינות', type: 'array' as const },
    ]

    for (const f of orgFields) {
      const pVal = primary[f.field]
      const sVal = secondary[f.field]
      
      if (f.type === 'array') {
        const pArr = pVal || []
        const sArr = sVal || []
        if (JSON.stringify(pArr.sort()) !== JSON.stringify(sArr.sort())) {
          conflicts.push({
            ...f,
            primaryValue: pArr,
            secondaryValue: sArr,
          })
        }
      } else {
        if ((pVal || '') !== (sVal || '') && (pVal || sVal)) {
          conflicts.push({
            ...f,
            primaryValue: pVal,
            secondaryValue: sVal,
          })
        }
      }
    }
  } else {
    const contactFields = [
      { field: 'firstName', label: 'שם פרטי', type: 'text' as const },
      { field: 'lastName', label: 'שם משפחה', type: 'text' as const },
      { field: 'phone', label: 'טלפון', type: 'text' as const },
      { field: 'phoneAlt', label: 'טלפון נוסף', type: 'text' as const },
      { field: 'email', label: 'אימייל', type: 'text' as const },
      { field: 'emailAlt', label: 'אימייל נוסף', type: 'text' as const },
      { field: 'role', label: 'תפקיד', type: 'text' as const },
      { field: 'department', label: 'מחלקה', type: 'text' as const },
      { field: 'notes', label: 'הערות', type: 'text' as const },
      { field: 'contactTypes', label: 'סוגי קשר', type: 'array' as const },
      { field: 'disciplines', label: 'דיסציפלינות', type: 'array' as const },
    ]

    for (const f of contactFields) {
      const pVal = primary[f.field]
      const sVal = secondary[f.field]
      
      if (f.type === 'array') {
        const pArr = pVal || []
        const sArr = sVal || []
        if (JSON.stringify(pArr.sort()) !== JSON.stringify(sArr.sort())) {
          conflicts.push({
            ...f,
            primaryValue: pArr,
            secondaryValue: sArr,
          })
        }
      } else {
        if ((pVal || '') !== (sVal || '') && (pVal || sVal)) {
          conflicts.push({
            ...f,
            primaryValue: pVal,
            secondaryValue: sVal,
          })
        }
      }
    }
  }

  return conflicts
}
