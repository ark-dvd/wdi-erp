// ============================================
// src/app/api/vehicles/[id]/parking/route.ts
// Version: 20260111-223000
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

async function findEmployeeByDate(vehicleId: string, date: Date): Promise<string | null> {
  const assignment = await prisma.vehicleAssignment.findFirst({
    where: {
      vehicleId,
      startDate: { lte: date },
      OR: [
        { endDate: null },
        { endDate: { gte: date } }
      ]
    },
    select: { employeeId: true }
  })
  return assignment?.employeeId || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const parkings = await prisma.vehicleParking.findMany({
      where: { vehicleId: params.id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(parkings)
  } catch (error) {
    console.error('Error fetching parkings:', error)
    return NextResponse.json({ error: 'Failed to fetch parkings' }, { status: 500 })
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
    
    const parkingDate = new Date(data.date)
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, parkingDate)
    
    const parking = await prisma.vehicleParking.create({
      data: {
        vehicleId: params.id,
        date: parkingDate,
        location: data.location,
        cost: parseFloat(data.cost),
        employeeId: employeeId,
        receiptUrl: data.receiptUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    await logCrud('CREATE', 'vehicles', 'parking', parking.id,
      `חניה ${vehicle.licensePlate}`, {
      vehicleId: params.id,
      location: data.location,
      cost: data.cost,
    })
    
    return NextResponse.json(parking, { status: 201 })
  } catch (error) {
    console.error('Error creating parking:', error)
    return NextResponse.json({ error: 'Failed to create parking' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { parkingId, ...updateData } = data
    
    if (!parkingId) {
      return NextResponse.json({ error: 'Missing parkingId' }, { status: 400 })
    }
    
    const parking = await prisma.vehicleParking.update({
      where: { id: parkingId },
      data: {
        date: updateData.date ? new Date(updateData.date) : undefined,
        location: updateData.location,
        cost: updateData.cost ? parseFloat(updateData.cost) : undefined,
        employeeId: updateData.employeeId || undefined,
        receiptUrl: updateData.receiptUrl,
        notes: updateData.notes,
      },
      include: { 
        employee: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { licensePlate: true } }
      }
    })
    
    await logCrud('UPDATE', 'vehicles', 'parking', parkingId,
      `חניה ${parking.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json(parking)
  } catch (error) {
    console.error('Error updating parking:', error)
    return NextResponse.json({ error: 'Failed to update parking' }, { status: 500 })
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
    const parkingId = searchParams.get('parkingId')
    
    if (!parkingId) {
      return NextResponse.json({ error: 'Missing parkingId' }, { status: 400 })
    }
    
    const parking = await prisma.vehicleParking.findUnique({
      where: { id: parkingId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!parking) {
      return NextResponse.json({ error: 'Parking not found' }, { status: 404 })
    }
    
    await prisma.vehicleParking.delete({ where: { id: parkingId } })
    
    await logCrud('DELETE', 'vehicles', 'parking', parkingId,
      `חניה ${parking.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting parking:', error)
    return NextResponse.json({ error: 'Failed to delete parking' }, { status: 500 })
  }
}
