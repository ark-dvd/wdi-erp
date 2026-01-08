// /home/user/wdi-erp/src/app/api/organizations/[id]/route.ts
// Version: 20251221-073300

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
  const { id } = await params
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any)?.id || null
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
        updatedById: userId,
      }
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
  const { id } = await params
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await prisma.organization.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
  }
}
