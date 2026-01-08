import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get the project to check its level
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, level: true }
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Collect all project IDs (this project + children for aggregation)
    const projectIds: string[] = [id]

    if (project.level === 'project' || project.level === 'quarter') {
      // Get child projects (areas under mega, or buildings under area)
      const children = await prisma.project.findMany({
        where: { parentId: id },
        select: { id: true, level: true }
      })
      projectIds.push(...children.map(c => c.id))

      // If mega, also get grandchildren (buildings under areas)
      if (project.level === 'project') {
        const grandchildren = await prisma.project.findMany({
          where: { parentId: { in: children.map(c => c.id) } },
          select: { id: true }
        })
        projectIds.push(...grandchildren.map(c => c.id))
      }
    }

    // Fetch contacts for all collected projects
    const contactProjects = await prisma.contactProject.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        contact: {
          include: {
            organization: { select: { id: true, name: true, type: true } }
          }
        },
        project: { select: { id: true, name: true, projectNumber: true, level: true } },
        updatedBy: { select: { id: true, name: true, employee: { select: { firstName: true, lastName: true } } } }
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }]
    })

    return NextResponse.json(contactProjects)
  } catch (error) {
    console.error('Error fetching project contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any)?.id || null
    const data = await request.json()

    // Check if contact already linked to this project
    const existing = await prisma.contactProject.findUnique({
      where: { contactId_projectId: { contactId: data.contactId, projectId: id } }
    })
    if (existing) {
      return NextResponse.json({ error: 'איש הקשר כבר משויך לפרויקט זה' }, { status: 400 })
    }

    const contactProject = await prisma.contactProject.create({
      data: {
        contactId: data.contactId,
        projectId: id,
        roleInProject: data.roleInProject || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        status: 'פעיל',
        notes: data.notes || null,
        updatedById: userId,
      },
      include: {
        contact: {
          include: { organization: { select: { id: true, name: true, type: true } } }
        },
        project: { select: { id: true, name: true, projectNumber: true, level: true } }
      }
    })

    // Update project's updatedAt
    await prisma.project.update({
      where: { id },
      data: { updatedById: userId }
    })

    return NextResponse.json(contactProject)
  } catch (error) {
    console.error('Error adding contact to project:', error)
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 })
  }
}
