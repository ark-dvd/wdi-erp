// Version: 20260124
// FIXED: Wrap POST in transaction for atomicity
// SECURITY: Added role-based authorization for POST
// Added: logCrud for CREATE
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

// Roles that can create/modify contact data
const CONTACTS_WRITE_ROLES = ['founder', 'admin', 'ceo', 'office_manager', 'project_manager']

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const discipline = searchParams.get('discipline')
    const organizationId = searchParams.get('organizationId')
    const status = searchParams.get('status')

    const where: any = {}
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }
    
    if (type) where.contactTypes = { has: type }
    if (discipline) where.disciplines = { has: discipline }
    if (organizationId) where.organizationId = organizationId
    if (status) where.status = status

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, type: true } },
        projects: {
          where: { status: 'פעיל' },
          include: {
            project: { select: { id: true, name: true, projectNumber: true } }
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            employee: { select: { firstName: true, lastName: true } }
          }
        },
        _count: { select: { projects: true } }
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role

    // Only authorized roles can create contacts
    if (!CONTACTS_WRITE_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'אין הרשאה ליצור אנשי קשר' }, { status: 403 })
    }

    const userId = (session.user as any)?.id || null
    const data = await request.json()

    const contact = await prisma.$transaction(async (tx) => {
      let organizationId = data.organizationId

      if (!organizationId) {
        const fullName = `${data.firstName} ${data.lastName}`
        const org = await tx.organization.create({
          data: {
            name: fullName,
            type: 'עצמאי',
            phone: data.phone || null,
            email: data.email || null,
            updatedById: userId,
          }
        })
        organizationId = org.id
      }

      const contact = await tx.contact.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          nickname: data.nickname || null,
          phone: data.phone,
          phoneAlt: data.phoneAlt || null,
          email: data.email || null,
          emailAlt: data.emailAlt || null,
          linkedinUrl: data.linkedinUrl || null,
          photoUrl: data.photoUrl || null,
          organizationId,
          role: data.role || null,
          department: data.department || null,
          contactTypes: data.contactTypes || [],
          disciplines: data.disciplines || [],
          status: data.status || 'פעיל',
          notes: data.notes || null,
          vendorId: data.vendorId || null,
          updatedById: userId,
        },
        include: {
          organization: { select: { id: true, name: true, type: true } },
        }
      })

      return contact
    })

    await logCrud('CREATE', 'contacts', 'contact', contact.id, `${data.firstName} ${data.lastName}`, {
      organizationName: contact.organization?.name,
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
