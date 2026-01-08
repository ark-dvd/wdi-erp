import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        managers: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, phone: true, email: true },
            },
          },
        },
        coordinators: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        parent: {
          select: { id: true, name: true, projectNumber: true },
        },
        children: {
          include: {
            lead: { select: { id: true, firstName: true, lastName: true } },
            managers: {
              include: {
                employee: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            children: {
              include: {
                lead: { select: { id: true, firstName: true, lastName: true } },
                managers: {
                  include: {
                    employee: { select: { id: true, firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
        events: {
          orderBy: { eventDate: 'desc' },
          take: 5,
          include: {
            createdBy: { select: { email: true } },
            files: true,
          },
        },
        _count: {
          select: { events: true, children: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch contacts from ContactProject table
    const contactProjects = await prisma.contactProject.findMany({
      where: { projectId: id },
      include: {
        contact: {
          include: { organization: true }
        }
      }
    })

    // Fetch contacts for children
    const childIds = project.children?.map(c => c.id) || []
    const grandchildIds = project.children?.flatMap(c => c.children?.map(gc => gc.id) || []) || []
    const allChildIds = [...childIds, ...grandchildIds]

    let childrenContacts: any[] = []
    if (allChildIds.length > 0) {
      childrenContacts = await prisma.contactProject.findMany({
        where: { projectId: { in: allChildIds } },
        include: {
          contact: { include: { organization: true } },
          project: { select: { id: true, name: true, projectNumber: true, level: true } }
        }
      })
    }

    // Add contacts to response
    const response = {
      ...project,
      contacts: contactProjects,
      childrenContacts
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()
    const { managerIds, ...projectData } = data

    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { projectNumber: true, name: true, state: true, phase: true, leadId: true, client: true, category: true }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const changes: Record<string, { from: any; to: any }> = {}
    const fieldsToCheck = ['name', 'state', 'phase', 'client', 'category', 'leadId']
    for (const field of fieldsToCheck) {
      if (projectData[field] !== (existingProject as any)[field]) {
        changes[field] = { from: (existingProject as any)[field], to: projectData[field] }
      }
    }

    // Get current user ID for updatedById
    const userId = (session.user as any)?.id

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: projectData.name,
        address: projectData.address || null,
        category: projectData.category || null,
        client: projectData.client || null,
        phase: projectData.phase || null,
        state: projectData.state || 'פעיל',
        area: projectData.area ? parseFloat(String(projectData.area)) : null,
        estimatedCost: projectData.estimatedCost ? parseFloat(String(projectData.estimatedCost)) : null,
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        description: projectData.description || null,
        leadId: projectData.leadId || null,
        services: projectData.services || undefined,
        buildingTypes: projectData.buildingTypes || undefined,
        deliveryMethods: projectData.deliveryMethods || undefined,
        updatedById: (session.user as any).id || null,
      },
    })

    await logCrud('UPDATE', 'projects', 'project', id, `${existingProject.projectNumber} - ${projectData.name}`, { changes })

    if (managerIds !== undefined) {
      await prisma.projectManager.deleteMany({
        where: { projectId: id },
      })

      if (managerIds && managerIds.length > 0) {
        for (const managerId of managerIds) {
          await prisma.projectManager.create({
            data: {
              projectId: id,
              employeeId: managerId,
            },
          })
        }
      }
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { projectNumber: true, name: true, projectType: true, level: true }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const childrenCount = await prisma.project.count({
      where: { parentId: id },
    })

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: 'לא ניתן למחוק פרויקט עם תתי-פרויקטים. יש למחוק קודם את תתי-הפרויקטים.' },
        { status: 400 }
      )
    }

    await prisma.projectManager.deleteMany({
      where: { projectId: id },
    })

    await prisma.project.delete({
      where: { id },
    })

    await logCrud('DELETE', 'projects', 'project', id, `${existingProject.projectNumber} - ${existingProject.name}`, {
      projectNumber: existingProject.projectNumber,
      projectType: existingProject.projectType,
      level: existingProject.level
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}