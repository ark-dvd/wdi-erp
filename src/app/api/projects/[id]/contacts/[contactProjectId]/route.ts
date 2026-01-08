import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

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

    await prisma.contactProject.delete({
      where: { id: contactProjectId },
    })

    // Update project's updatedAt
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact-project:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
