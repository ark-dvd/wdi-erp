// Version: 20260124
// Added: logCrud for CREATE
// SECURITY: Added role-based authorization for POST
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

// Roles that can link contacts to projects (RBAC v2 per DOC-014 §6.1)
const PROJECTS_WRITE_ROLES = ['owner', 'executive', 'domain_head', 'project_manager', 'project_coordinator', 'administration']

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

    const userRole = (session.user as any)?.role

    // Only authorized roles can link contacts to projects
    if (!PROJECTS_WRITE_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'אין הרשאה לשייך אנשי קשר לפרויקט' }, { status: 403 })
    }

    const userId = (session.user as any)?.id || null
    const data = await request.json()

    // Check if contact already linked to this project
    const existing = await prisma.contactProject.findUnique({
      where: { contactId_projectId: { contactId: data.contactId, projectId: id } }
    })
    if (existing) {
      return NextResponse.json({ error: 'איש הקשר כבר משויך לפרויקט זה' }, { status: 409 })
    }

    // Get contact and project info for logging
    const [contact, project] = await Promise.all([
      prisma.contact.findUnique({
        where: { id: data.contactId },
        select: { firstName: true, lastName: true }
      }),
      prisma.project.findUnique({
        where: { id },
        select: { name: true, projectNumber: true }
      })
    ])

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

    // Logging - added
    await logCrud('CREATE', 'projects', 'contact-project', contactProject.id,
      `שיוך ${contact?.firstName} ${contact?.lastName} לפרויקט ${project?.name}`, {
      projectId: id,
      projectName: project?.name,
      contactId: data.contactId,
      contactName: `${contact?.firstName} ${contact?.lastName}`,
      roleInProject: data.roleInProject,
    })

    return NextResponse.json(contactProject, { status: 201 })
  } catch (error) {
    console.error('Error adding contact to project:', error)
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 })
  }
}
