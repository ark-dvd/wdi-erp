// ================================================
// WDI ERP - Admin Duplicate Merge API
// Version: 20260202-RBAC-V2-PHASE3
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import {
  mergeOrganizations,
  mergeContacts,
  FieldResolution
} from '@/lib/duplicate-detection'
import { requirePermission } from '@/lib/permissions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v2 / DOC-016 §6.1: Operation-specific permission check
    const denied = await requirePermission(session, 'admin', 'update')
    if (denied) return denied

    const userId = (session.user as any).id
    const { masterId, fieldResolutions } = await request.json() as {
      masterId: string
      fieldResolutions: FieldResolution[]
    }

    // שליפת DuplicateSet
    const duplicateSet = await prisma.duplicateSet.findUnique({
      where: { id }
    })

    if (!duplicateSet) {
      return NextResponse.json({ error: 'כפילות לא נמצאה' }, { status: 404 })
    }

    if (duplicateSet.status === 'merged') {
      return NextResponse.json({ error: 'כפילות זו כבר מוזגה' }, { status: 400 })
    }

    // masterId מה-UI הוא ה-survivor, השני הוא ה-merged
    const survivorId = masterId
    const mergedId = masterId === duplicateSet.primaryId 
      ? duplicateSet.secondaryId 
      : duplicateSet.primaryId

    // ביצוע המיזוג
    let result
    if (duplicateSet.entityType === 'organization') {
      result = await mergeOrganizations(survivorId, mergedId, fieldResolutions, userId)
    } else {
      result = await mergeContacts(survivorId, mergedId, fieldResolutions, userId)
    }

    // עדכון סטטוס DuplicateSet
    await prisma.duplicateSet.update({
      where: { id },
      data: {
        status: 'merged',
        reviewedById: userId,
        reviewedAt: new Date(),
      }
    })

    // רישום פעילות
    await logActivity({
      action: 'UPDATE',
      category: 'data',
      module: 'admin',
      targetType: duplicateSet.entityType,
      targetId: survivorId,
      targetName: `Merge: ${mergedId} -> ${survivorId}`,
      details: {
        action: 'merge',
        survivorId,
        mergedId,
        mergeHistoryId: result.mergeHistoryId,
        transferredRelations: result.transferredRelations,
      }
    })

    return NextResponse.json({
      success: true,
      survivorId: result.survivorId,
      mergedId: result.mergedId,
      mergeHistoryId: result.mergeHistoryId,
      transferredRelations: result.transferredRelations,
      message: 'המיזוג בוצע בהצלחה'
    })

  } catch (error) {
    console.error('Merge error:', error)
    return NextResponse.json({ 
      error: 'שגיאה במיזוג',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
