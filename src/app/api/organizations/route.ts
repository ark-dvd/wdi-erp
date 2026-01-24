// Version: 20260124
// Added: logCrud for CREATE
// SECURITY: Added role-based authorization for POST
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

// Roles that can create/modify organization data
const ORGS_WRITE_ROLES = ['founder', 'admin', 'ceo', 'office_manager', 'project_manager']

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (type) where.type = type
    const organizations = await prisma.organization.findMany({
      where,
      include: {
        _count: { select: { contacts: true } },
        updatedBy: { select: { name: true, employee: { select: { firstName: true, lastName: true } } } }
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(organizations)
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = (session.user as any)?.role

    // Only authorized roles can create organizations
    if (!ORGS_WRITE_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'אין הרשאה ליצור ארגונים' }, { status: 403 })
    }

    const userId = (session.user as any)?.id || null
    const data = await request.json()
    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        type: data.type || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        address: data.address || null,
        businessId: data.businessId || null,
        logoUrl: data.logoUrl || null,
        notes: data.notes || null,
        isVendor: data.isVendor || false,
        contactTypes: data.contactTypes || [],
        disciplines: data.disciplines || [],
        updatedById: userId,
      }
    })

    // Logging - added
    await logCrud('CREATE', 'organizations', 'organization', organization.id, data.name, {
      type: data.type,
      isVendor: data.isVendor,
    })

    return NextResponse.json(organization)
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }
}
