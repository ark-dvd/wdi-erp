// /home/user/wdi-erp/src/app/api/admin/duplicates/[id]/merge/route.ts
// Version: 20260125-RBAC-V1
// FIXED: Return values match new function signatures (survivorId, mergedId)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import {
  mergeOrganizations,
  mergeContacts,
  FieldResolution
} from '@/lib/duplicate-detection'

import { checkAdminAccess } from '@/lib/authorization'

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

    if (!checkAdminAccess(session)) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 403 })
    }

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
