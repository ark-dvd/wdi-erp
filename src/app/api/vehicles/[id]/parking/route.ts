// ============================================
// src/app/api/vehicles/[id]/parking/route.ts
// Version: 20260110-080000
// Added: PUT, DELETE methods
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function findEmployeeByDate(vehicleId: string, date: Date): Promise<string | null> {
  const assignment = await prisma.vehicleAssignment.findFirst({
    where: {
      vehicleId,
      startDate: { lte: date },
      OR: [{ endDate: null }, { endDate: { gte: date } }]
    },
    select: { employeeId: true }
  })
  return assignment?.employeeId || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } })
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    const parkingDate = new Date(data.date)
    
    // מציאת העובד שהחזיק ברכב בתאריך החניה
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, parkingDate)
    
    const parking = await prisma.vehicleParking.create({
      data: {
        vehicleId: params.id,
        date: parkingDate,
        employeeId,
        location: data.location,
        parkingLot: data.parkingLot || null,
        duration: data.duration ? parseInt(data.duration) : null,
        cost: parseFloat(data.cost),
        receiptUrl: data.receiptUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
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
  try {
    const { searchParams } = new URL(request.url)
    const parkingId = searchParams.get('parkingId')
    
    if (!parkingId) {
      return NextResponse.json({ error: 'parkingId is required' }, { status: 400 })
    }
    
    const data = await request.json()
    
    const parking = await prisma.vehicleParking.update({
      where: { id: parkingId },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        employeeId: data.employeeId || undefined,
        location: data.location,
        parkingLot: data.parkingLot || null,
        duration: data.duration ? parseInt(data.duration) : null,
        cost: data.cost ? parseFloat(data.cost) : undefined,
        receiptUrl: data.receiptUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
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
  try {
    const { searchParams } = new URL(request.url)
    const parkingId = searchParams.get('parkingId')
    
    if (!parkingId) {
      return NextResponse.json({ error: 'parkingId is required' }, { status: 400 })
    }
    
    await prisma.vehicleParking.delete({
      where: { id: parkingId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting parking:', error)
    return NextResponse.json({ error: 'Failed to delete parking' }, { status: 500 })
  }
}
