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

    // RBAC v2: Check read permission (organizations use 'contacts' module per DOC-013 §6.1)
    const denied = await requirePermission(session, 'contacts', 'read', { id })
    if (denied) return denied

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        contacts: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            phone: true, 
            email: true, 
            role: true, 
            status: true,
            averageRating: true,
            reviewCount: true,
          },
          orderBy: { lastName: 'asc' }
        },
        updatedBy: { select: { name: true, employee: { select: { firstName: true, lastName: true } } } },
      }
    })
    
    if (!organization) return NextResponse.json({ error: 'ארגון לא נמצא' }, { status: 404 })

    // שליפת דירוגים אחרונים דרך אנשי הקשר
    const contactIds = organization.contacts.map(c => c.id)
    const recentReviews = await prisma.individualReview.findMany({
      where: { contactId: { in: contactIds } },
      include: {
        reviewer: { 
          select: { 
            id: true, 
            name: true, 
            employee: { select: { firstName: true, lastName: true } } 
          } 
        },
        project: { select: { id: true, name: true, projectNumber: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      ...organization,
      recentReviews,
    })
  } catch (error) {
    console.error('Error fetching organization:', error)
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    // RBAC v2: Check update permission (organizations use 'contacts' module per DOC-013 §6.1)
    const denied = await requirePermission(session, 'contacts', 'update', { id })
    if (denied) return denied

    const userId = (session!.user as any)?.id || null
    const data = await request.json()
    const organization = await prisma.organization.update({
      where: { id },
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
        otherText: data.otherText || null,
        updatedById: userId,
      }
    })

    // Logging - added
    await logCrud('UPDATE', 'organizations', 'organization', id, data.name, {
      type: data.type,
      isVendor: data.isVendor,
    })

    return NextResponse.json(organization)
  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    // RBAC v2: Check delete permission (organizations use 'contacts' module per DOC-013 §6.1)
    const denied = await requirePermission(session, 'contacts', 'delete', { id })
    if (denied) return denied

    // Get org info before delete for logging
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { name: true, type: true }
    })

    if (!org) {
      return NextResponse.json({ error: 'ארגון לא נמצא' }, { status: 404 })
    }

    await prisma.organization.delete({ where: { id } })

    // Logging - added
    if (org) {
      await logCrud('DELETE', 'organizations', 'organization', id, org.name, {
        type: org.type,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
  }
}
