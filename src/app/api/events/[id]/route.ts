// ============================================
// src/app/api/events/[id]/route.ts
// Version: 20260127
// RBAC v2: Use permission system from DOC-013/DOC-014
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

    // RBAC v2: Check read permission
    const denied = await requirePermission(session, 'events', 'read', { id })
    if (denied) return denied

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
  try {
    const session = await auth()
    const { id } = await params

    // RBAC v2: Check update permission
    const denied = await requirePermission(session, 'events', 'update', { id })
    if (denied) return denied
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
  try {
    const session = await auth()
    const { id } = await params

    // RBAC v2: Check delete permission
    const denied = await requirePermission(session, 'events', 'delete', { id })
    if (denied) return denied

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
