// ============================================
// src/app/api/vehicles/[id]/photos/route.ts
// Version: 20260111-142300
// Added: logCrud for CREATE, DELETE
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photos = await prisma.vehiclePhoto.findMany({
      where: { vehicleId: params.id },
      include: {
        assignment: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { takenAt: 'desc' }
    })
    return NextResponse.json(photos)
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    
    if (!data.photoType) {
      return NextResponse.json({ error: 'חובה לבחור סוג תמונה' }, { status: 400 })
    }
    if (!data.eventType) {
      return NextResponse.json({ error: 'חובה לבחור סוג אירוע' }, { status: 400 })
    }
    if (!data.fileUrl) {
      return NextResponse.json({ error: 'חובה להעלות תמונה' }, { status: 400 })
    }
    
    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    // אם זו תמונת קבלה/מסירה, חייב assignmentId
    if ((data.eventType === 'HANDOVER_IN' || data.eventType === 'HANDOVER_OUT') && !data.assignmentId) {
      return NextResponse.json({ error: 'תמונות קבלה/מסירה חייבות להיות משויכות להחלפת ידיים' }, { status: 400 })
    }
    
    const photo = await prisma.vehiclePhoto.create({
      data: {
        vehicleId: params.id,
        assignmentId: data.assignmentId || null,
        photoType: data.photoType,
        eventType: data.eventType,
        fileUrl: data.fileUrl,
        fileName: data.fileName || 'תמונה',
        takenAt: data.takenAt ? new Date(data.takenAt) : new Date(),
        notes: data.notes || null,
        createdBy: data.createdBy || null,
      },
      include: {
        assignment: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      }
    })
    
    // Logging - added
    await logCrud('CREATE', 'vehicles', 'photo', photo.id,
      `תמונה ${vehicle.licensePlate} - ${data.photoType}`, {
      vehicleId: params.id,
      vehicleName: `${vehicle.manufacturer} ${vehicle.model}`,
      photoType: data.photoType,
      eventType: data.eventType,
    })
    
    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    console.error('Error creating photo:', error)
    return NextResponse.json({ error: 'Failed to create photo' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    
    if (!photoId) {
      return NextResponse.json({ error: 'חסר מזהה תמונה' }, { status: 400 })
    }
    
    const photo = await prisma.vehiclePhoto.findUnique({
      where: { id: photoId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!photo || photo.vehicleId !== params.id) {
      return NextResponse.json({ error: 'תמונה לא נמצאה' }, { status: 404 })
    }
    
    await prisma.vehiclePhoto.delete({
      where: { id: photoId }
    })
    
    // Logging - added
    await logCrud('DELETE', 'vehicles', 'photo', photoId,
      `תמונה ${photo.vehicle.licensePlate} - ${photo.photoType}`, {
      vehicleId: params.id,
      photoType: photo.photoType,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
