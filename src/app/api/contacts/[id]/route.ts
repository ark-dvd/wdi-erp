// Version: 20260127
// RBAC v2: Use permission system from DOC-013/DOC-014

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
    const denied = await requirePermission(session, 'contacts', 'read', { id })
    if (denied) return denied

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        organization: true,
        vendor: { select: { id: true, name: true, discipline: true } },
        projects: {
          include: {
            project: { select: { id: true, name: true, projectNumber: true, state: true, client: true } },
            updatedBy: { select: { id: true, name: true, employee: { select: { firstName: true, lastName: true } } } }
          },
          orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }]
        },
        updatedBy: { select: { id: true, name: true, employee: { select: { firstName: true, lastName: true } } } },
        individualReviews: {
          include: {
            reviewer: { 
              select: { 
                id: true, 
                name: true, 
                employee: { select: { firstName: true, lastName: true } } 
              } 
            },
            project: { select: { id: true, name: true, projectNumber: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        _count: {
          select: { individualReviews: true }
        }
      }
    })
    if (!contact) return NextResponse.json({ error: 'איש קשר לא נמצא' }, { status: 404 })

    // חישוב ממוצע דירוג
    const allReviews = await prisma.individualReview.findMany({
      where: { contactId: id },
      select: { avgRating: true }
    })
    
    const reviewCount = allReviews.length
    const averageRating = reviewCount > 0
      ? allReviews.reduce((sum, r) => sum + (r.avgRating || 0), 0) / reviewCount
      : null

    return NextResponse.json({
      ...contact,
      reviewCount,
      averageRating
    })
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
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
    const denied = await requirePermission(session, 'contacts', 'update', { id })
    if (denied) return denied

    const userId = (session!.user as any)?.id || null
    const data = await request.json()
    const contact = await prisma.contact.update({
      where: { id },
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
        organizationId: data.organizationId,
        role: data.role || null,
        department: data.department || null,
        contactTypes: data.contactTypes || [],
        disciplines: data.disciplines || [],
        otherText: data.otherText || null,
        status: data.status || 'פעיל',
        notes: data.notes || null,
        vendorId: data.vendorId || null,
        updatedById: userId,
      },
      include: { organization: { select: { id: true, name: true, type: true } } }
    })

    // Logging - added
    await logCrud('UPDATE', 'contacts', 'contact', id, `${data.firstName} ${data.lastName}`, {
      organizationName: contact.organization?.name,
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
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
    const denied = await requirePermission(session, 'contacts', 'delete', { id })
    if (denied) return denied

    // Get contact info before delete for logging
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { firstName: true, lastName: true, organization: { select: { name: true } } }
    })

    if (!contact) {
      return NextResponse.json({ error: 'איש קשר לא נמצא' }, { status: 404 })
    }

    await prisma.contact.delete({ where: { id } })

    // Logging - added
    if (contact) {
      await logCrud('DELETE', 'contacts', 'contact', id, `${contact.firstName} ${contact.lastName}`, {
        organizationName: contact.organization?.name,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
