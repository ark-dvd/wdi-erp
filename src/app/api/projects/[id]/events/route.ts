import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
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
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        createdById: (session.user as any).id || null,
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

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת אירוע' }, { status: 500 })
  }
}
