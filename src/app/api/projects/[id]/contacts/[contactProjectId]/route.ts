// Version: 20260111-143100
// Added: logCrud for UPDATE, DELETE
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactProjectId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, contactProjectId } = await params
    const data = await request.json()

    // Get info for logging before update
    const existingCP = await prisma.contactProject.findUnique({
      where: { id: contactProjectId },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } }
      }
    })

    const updated = await prisma.contactProject.update({
      where: { id: contactProjectId },
      data: {
        roleInProject: data.roleInProject,
        status: data.status,
        updatedById: session.user?.id,
      },
    })

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    })

    // Logging - added
    if (existingCP) {
      await logCrud('UPDATE', 'projects', 'contact-project', contactProjectId,
        `עדכון ${existingCP.contact.firstName} ${existingCP.contact.lastName} בפרויקט ${existingCP.project.name}`, {
        projectId,
        projectName: existingCP.project.name,
        contactName: `${existingCP.contact.firstName} ${existingCP.contact.lastName}`,
        roleInProject: data.roleInProject,
        status: data.status,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating contact-project:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactProjectId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, contactProjectId } = await params

    // Get info for logging before delete
    const cp = await prisma.contactProject.findUnique({
      where: { id: contactProjectId },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } }
      }
    })

    await prisma.contactProject.delete({
      where: { id: contactProjectId },
    })

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    })

    // Logging - added
    if (cp) {
      await logCrud('DELETE', 'projects', 'contact-project', contactProjectId,
        `הסרת ${cp.contact.firstName} ${cp.contact.lastName} מפרויקט ${cp.project.name}`, {
        projectId,
        projectName: cp.project.name,
        contactName: `${cp.contact.firstName} ${cp.contact.lastName}`,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact-project:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
