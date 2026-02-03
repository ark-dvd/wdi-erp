// ============================================
// src/app/api/upload/route.ts
// Version: 20260202-RBAC-V2-PHASE5-C
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// C3: Parent-follow rules with ASSIGNED scope support
// INV-004: Authorization check required
// INV-006: Server-side parent verification (DOC-013 §6.3 M-005)
// ============================================

import { NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'

const storage = new Storage()
const bucketName = process.env.GCS_BUCKET_NAME || 'wdi-erp-files'

// DOC-016 §4.3: Document access follows parent entity permissions
// Map folder names to their parent module for authorization
const FOLDER_MODULE_MAP: Record<string, string> = {
  events: 'events',
  employees: 'hr',
  projects: 'projects',
  vehicles: 'vehicles',
  equipment: 'equipment',
  contacts: 'contacts',
}

export async function POST(request: Request) {
  const session = await auth()
  const userId = (session?.user as any)?.id || null
  const userRole = (session?.user as any)?.role || null

  try {
    // INV-004: Authorization check required for all data-modifying routes
    if (!session) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'uploads'
    // Phase 0: Require server-verifiable parent context (INV-006, FP-001)
    const parentId = formData.get('parentId') as string | null
    const parentModule = FOLDER_MODULE_MAP[folder]

    // DOC-016 §4.3, INV-006: Server must verify parent context, not trust client
    // If folder maps to a known module, we MUST have verifiable parent context
    if (parentModule && parentModule !== 'hr') {
      // For project-related modules, require and verify projectId
      if (!parentId) {
        // DOC-016 §7.1: Log authorization denial
        await logActivity({
          action: 'UPLOAD',
          category: 'SECURITY',
          module: 'files',
          userId,
          userRole,
          details: {
            decision: 'DENY',
            reason: 'MISSING_PARENT_CONTEXT',
            folder,
            requiredModule: parentModule,
          },
        })
        return NextResponse.json(
          { error: 'חסר הקשר להעלאה. נא לציין את הישות המקושרת.' },
          { status: 403 }
        )
      }

      // INV-006: Server-side verification of parent entity
      let parentExists = false
      let domainId: string | undefined

      if (parentModule === 'events' || parentModule === 'projects') {
        const project = await prisma.project.findUnique({
          where: { id: parentId },
          select: { id: true, domainId: true },
        })
        parentExists = !!project
        domainId = project?.domainId || undefined
      } else if (parentModule === 'vehicles') {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: parentId } })
        parentExists = !!vehicle
      } else if (parentModule === 'equipment') {
        const equipment = await prisma.equipment.findUnique({ where: { id: parentId } })
        parentExists = !!equipment
      } else if (parentModule === 'contacts') {
        const contact = await prisma.contact.findUnique({ where: { id: parentId } })
        parentExists = !!contact
      }

      if (!parentExists) {
        await logActivity({
          action: 'UPLOAD',
          category: 'SECURITY',
          module: 'files',
          userId,
          userRole,
          details: {
            decision: 'DENY',
            reason: 'PARENT_NOT_FOUND',
            folder,
            parentId,
            parentModule,
          },
        })
        return NextResponse.json(
          { error: 'הישות המקושרת לא נמצאה' },
          { status: 404 }
        )
      }

      // INV-004, CC-002: Check permission for the parent module (create = write operation)
      const denied = await requirePermission(session, parentModule, 'create', {
        projectId: (parentModule === 'events' || parentModule === 'projects') ? parentId : undefined,
        domainId,
        id: parentId,
      })
      if (denied) {
        // DOC-016 §7.1: Log authorization denial
        await logActivity({
          action: 'UPLOAD',
          category: 'SECURITY',
          module: 'files',
          userId,
          userRole,
          details: {
            decision: 'DENY',
            reason: 'PERMISSION_DENIED',
            folder,
            parentId,
            parentModule,
          },
        })
        return denied
      }

      // DOC-016 §7.1: Log authorization grant
      await logActivity({
        action: 'UPLOAD',
        category: 'SECURITY',
        module: 'files',
        userId,
        userRole,
        details: {
          decision: 'GRANT',
          folder,
          parentId,
          parentModule,
        },
      })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // בדיקת גודל קובץ (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'קובץ גדול מדי. מקסימום 10MB' },
        { status: 400 }
      )
    }

    // בדיקת סוג קובץ
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'סוג קובץ לא נתמך. מותר: תמונות ו-PDF' },
        { status: 400 }
      )
    }

    // יצירת שם קובץ ייחודי
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()
    const fileName = `${folder}/${timestamp}-${randomString}.${extension}`

    // העלאה ל-GCS
    const bucket = storage.bucket(bucketName)
    const blob = bucket.file(fileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    await blob.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    })

    // יצירת URL ציבורי
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`

    // Logging - added
    await logActivity({
      action: 'UPLOAD',
      category: 'files',
      module: 'files',
      targetType: 'file',
      targetId: fileName,
      targetName: file.name,
      details: {
        folder,
        originalName: file.name,
        type: file.type,
        size: file.size,
        path: fileName,
      }
    })

    return NextResponse.json({
      url: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      path: fileName,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
