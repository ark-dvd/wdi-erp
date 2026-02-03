// ============================================
// src/app/api/events/[id]/route.ts
// Version: 20260202-RBAC-V2-PHASE5-C
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// C1: Fixed projectId passing for ASSIGNED scope enforcement
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { requirePermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    const event = await prisma.projectEvent.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, projectNumber: true, domainId: true, parent: { select: { id: true, name: true, projectNumber: true, parent: { select: { id: true, name: true, projectNumber: true } } } } } },
        createdBy: { select: { id: true, name: true, email: true, employee: { select: { firstName: true, lastName: true } } } },
        files: true,
      },
    })

    if (!event) return NextResponse.json({ error: 'אירוע לא נמצא' }, { status: 404 })

    // C1: RBAC v2 / DOC-016 §6.1: Permission gate for reading events
    // CRITICAL: Pass projectId (not event id) for ASSIGNED scope enforcement
    // Also pass domainId for DOMAIN scope and createdById for OWN scope
    const denied = await requirePermission(session, 'events', 'read', {
      id,
      projectId: event.projectId,
      domainId: event.project?.domainId || undefined,
      createdById: event.createdById || undefined
    })
    if (denied) return denied

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    const data = await request.json()

    // Get event with project info for RBAC check and logging
    const existingEvent = await prisma.projectEvent.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, domainId: true } } }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'אירוע לא נמצא' }, { status: 404 })
    }

    // C1: RBAC v2 / DOC-016 §6.1: Permission gate for updating events
    // CRITICAL: Pass projectId (not event id) for ASSIGNED scope enforcement
    // Also pass domainId for DOMAIN scope and createdById for OWN scope
    const denied = await requirePermission(session, 'events', 'update', {
      id,
      projectId: existingEvent.projectId,
      domainId: existingEvent.project?.domainId || undefined,
      createdById: existingEvent.createdById || undefined
    })
    if (denied) return denied

    const event = await prisma.projectEvent.update({
      where: { id },
      data: {
        eventType: data.eventType,
        description: data.description,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
      },
    })

    // Logging - added
    await logCrud('UPDATE', 'events', 'event', id,
      `${data.eventType} - ${existingEvent?.project?.name || ''}`, {
      projectName: existingEvent?.project?.name,
      eventType: data.eventType,
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    // Get event info before delete for RBAC check and logging
    const event = await prisma.projectEvent.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, domainId: true } } }
    })

    if (!event) {
      return NextResponse.json({ error: 'אירוע לא נמצא' }, { status: 404 })
    }

    // C1: RBAC v2 / DOC-016 §6.1: Permission gate for deleting events
    // CRITICAL: Pass projectId (not event id) for ASSIGNED scope enforcement
    // Also pass domainId for DOMAIN scope and createdById for OWN scope
    const denied = await requirePermission(session, 'events', 'delete', {
      id,
      projectId: event.projectId,
      domainId: event.project?.domainId || undefined,
      createdById: event.createdById || undefined
    })
    if (denied) return denied

    // Delete associated files first
    await prisma.eventFile.deleteMany({
      where: { eventId: id },
    })

    await prisma.projectEvent.delete({
      where: { id },
    })

    // Logging - added
    if (event) {
      await logCrud('DELETE', 'events', 'event', id,
        `${event.eventType} - ${event.project?.name || ''}`, {
        projectName: event.project?.name,
        eventType: event.eventType,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
