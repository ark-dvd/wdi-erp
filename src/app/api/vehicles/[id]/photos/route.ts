// ============================================
// src/app/api/vehicles/[id]/photos/route.ts
// Version: 20260111-223000
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const photos = await prisma.vehiclePhoto.findMany({
      where: { vehicleId: params.id },
      orderBy: [{ event: 'asc' }, { createdAt: 'desc' }]
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { id: true, licensePlate: true }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    const photo = await prisma.vehiclePhoto.create({
      data: {
        vehicleId: params.id,
        type: data.type,
        event: data.event,
        url: data.url,
        description: data.description || null,
        takenAt: data.takenAt ? new Date(data.takenAt) : new Date(),
      }
    })
    
    await logCrud('CREATE', 'vehicles', 'photo', photo.id,
      `תמונה ${vehicle.licensePlate}`, {
      vehicleId: params.id,
      type: data.type,
      event: data.event,
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    
    if (!photoId) {
      return NextResponse.json({ error: 'Missing photoId' }, { status: 400 })
    }
    
    const photo = await prisma.vehiclePhoto.findUnique({
      where: { id: photoId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }
    
    await prisma.vehiclePhoto.delete({ where: { id: photoId } })
    
    await logCrud('DELETE', 'vehicles', 'photo', photoId,
      `תמונה ${photo.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
