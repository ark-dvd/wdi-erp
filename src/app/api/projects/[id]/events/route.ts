// Version: 20260202-RBAC-V2-PHASE5-C
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// C4: Project events with ASSIGNED scope support via projectId+domainId
// INV-004, INV-003, INV-008: Authorization, server-side scope, fail-closed
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logCrud, logActivity } from '@/lib/activity'
import { supportsTextExtraction } from '@/lib/text-extraction'
import { requirePermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = (session?.user as any)?.id || null
  const userRole = (session?.user as any)?.role || null
  const { id } = await params

  try {
    // INV-004: Authorization check required for all data-accessing routes
    if (!session) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // INV-003: Scope evaluation server-side only
    // First get project to verify it exists and get domainId for scope check
    const projectForAuth = await prisma.project.findUnique({
      where: { id },
      select: { id: true, domainId: true },
    })

    if (!projectForAuth) {
      return NextResponse.json({ error: 'פרויקט לא נמצא' }, { status: 404 })
    }

    // INV-004, CC-002: Check READ permission for events on this project
    const denied = await requirePermission(session, 'events', 'read', {
      projectId: id,
      domainId: projectForAuth.domainId || undefined,
    })
    if (denied) {
      // DOC-016 §7.1: Log authorization denial
      await logActivity({
        action: 'READ',
        category: 'SECURITY',
        module: 'events',
        userId,
        userRole,
        targetType: 'project_events',
        targetId: id,
        details: {
          decision: 'DENY',
          reason: 'PERMISSION_DENIED',
          operation: 'READ',
        },
      })
      return denied
    }

    // DOC-016 §7.1: Log authorization grant
    await logActivity({
      action: 'READ',
      category: 'SECURITY',
      module: 'events',
      userId,
      userRole,
      targetType: 'project_events',
      targetId: id,
      details: {
        decision: 'GRANT',
        operation: 'READ',
      },
    })

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        children: {
          select: {
            id: true,
            children: { select: { id: true } }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'פרויקט לא נמצא' }, { status: 404 })
    }

    const projectIds = [project.id]
    project.children.forEach(child => {
      projectIds.push(child.id)
      child.children.forEach(grandchild => {
        projectIds.push(grandchild.id)
      })
    })

    const events = await prisma.projectEvent.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        files: true,
        project: { select: { id: true, name: true, projectNumber: true, level: true, parent: { select: { id: true, name: true, projectNumber: true, parent: { select: { id: true, name: true, projectNumber: true } } } } } },
        createdBy: {
          select: {
            id: true,
            name: true,
            employee: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { eventDate: 'desc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת אירועים' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    // Get project info first (needed for domain check and logging)
    const project = await prisma.project.findUnique({
      where: { id },
      select: { name: true, projectNumber: true, domainId: true }
    })

    if (!project) {
      return NextResponse.json({ error: 'פרויקט לא נמצא' }, { status: 404 })
    }

    // RBAC v2: Check create permission for events on this project
    // Include domainId to enforce DOMAIN scope checks for domain_head users
    const denied = await requirePermission(session, 'events', 'create', {
      projectId: id,
      domainId: project.domainId || undefined
    })
    if (denied) return denied

    const data = await request.json()
    if (!data.eventType || !data.description) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    const event = await prisma.projectEvent.create({
      data: {
        projectId: id,
        eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
        eventType: data.eventType,
        description: data.description,
        createdById: (session!.user as any).id || null,
        files: data.files && data.files.length > 0 ? {
          create: data.files.map((file: any) => ({
            fileUrl: file.fileUrl,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize || null
          }))
        } : undefined
      },
      include: { files: true }
    })

    // Logging - added
    await logCrud('CREATE', 'events', 'event', event.id,
      `${data.eventType} - ${project?.name || ''}`, {
      projectId: id,
      projectName: project?.name,
      projectNumber: project?.projectNumber,
      eventType: data.eventType,
    })

    // Trigger text extraction for files (async, non-blocking)
    if (event.files && event.files.length > 0) {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://erp.wdi.one'
      for (const file of event.files) {
        if (supportsTextExtraction(file.fileType, file.fileUrl)) {
          // Fire and forget - don't await
          fetch(`${baseUrl}/api/extract-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: file.id }),
          }).catch(err => console.error('Text extraction trigger failed:', err))
        }
      }
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת אירוע' }, { status: 500 })
  }
}
