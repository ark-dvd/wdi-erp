// /home/user/wdi-erp/src/app/api/admin/duplicates/[id]/undo/route.ts
// Version: 20260125-RBAC-V1
// FIXED: Field names to match Schema (survivorId, mergedId)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { undoMerge } from '@/lib/duplicate-detection'

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

    // שליפת DuplicateSet
    const duplicateSet = await prisma.duplicateSet.findUnique({
      where: { id }
    })

    if (!duplicateSet) {
      return NextResponse.json({ error: 'כפילות לא נמצאה' }, { status: 404 })
    }

    if (duplicateSet.status !== 'merged') {
      return NextResponse.json({ error: 'רק כפילויות שמוזגו ניתנות לביטול' }, { status: 400 })
    }

    // מציאת MergeHistory הרלוונטי - שמות שדות נכונים לפי Schema
    const mergeHistory = await prisma.mergeHistory.findFirst({
      where: {
        entityType: duplicateSet.entityType,
        OR: [
          { survivorId: duplicateSet.primaryId, mergedId: duplicateSet.secondaryId },
          { survivorId: duplicateSet.secondaryId, mergedId: duplicateSet.primaryId },
        ],
        undoneAt: null,
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!mergeHistory) {
      return NextResponse.json({ error: 'לא נמצאה היסטוריית מיזוג לביטול' }, { status: 404 })
    }

    // ביצוע הביטול
    const result = await undoMerge(mergeHistory.id, userId)

    // עדכון סטטוס DuplicateSet חזרה ל-pending
    await prisma.duplicateSet.update({
      where: { id },
      data: {
        status: 'pending',
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
      targetId: result.restoredId,
      targetName: `Undo merge: restored ${result.restoredId}`,
      details: {
        action: 'undo_merge',
        mergeHistoryId: mergeHistory.id,
        restoredId: result.restoredId,
      }
    })

    return NextResponse.json({
      success: true,
      restoredId: result.restoredId,
      message: 'המיזוג בוטל בהצלחה, הרשומה שוחזרה'
    })

  } catch (error) {
    console.error('Undo merge error:', error)
    return NextResponse.json({ 
      error: 'שגיאה בביטול המיזוג',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
