// ============================================
// src/app/api/events/[id]/route.ts
// Version: 20260124
// Added: logCrud for UPDATE, DELETE
// SECURITY: Added role-based authorization for PUT, DELETE
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

// Roles that can manage events (same as projects)
const EVENTS_WRITE_ROLES = ['founder', 'admin', 'ceo', 'office_manager', 'project_manager']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const event = await prisma.projectEvent.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        createdBy: { select: { email: true } },
        files: true,
      },
    })

    if (!event) return NextResponse.json({ error: 'אירוע לא נמצא' }, { status: 404 })

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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as any)?.role

  // Only authorized roles can update events
  if (!EVENTS_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה לעדכן אירועים' }, { status: 403 })
  }

  try {
    const { id } = await params
    const data = await request.json()

    // Get event with project info for logging
    const existingEvent = await prisma.projectEvent.findUnique({
      where: { id },
      include: { project: { select: { name: true } } }
    })

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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as any)?.role

  // Only authorized roles can delete events
  if (!EVENTS_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה למחוק אירועים' }, { status: 403 })
  }

  try {
    const { id } = await params

    // Get event info before delete for logging
    const event = await prisma.projectEvent.findUnique({
      where: { id },
      include: { project: { select: { name: true } } }
    })

    if (!event) {
      return NextResponse.json({ error: 'אירוע לא נמצא' }, { status: 404 })
    }

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
