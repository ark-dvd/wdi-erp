// ============================================
// src/app/api/vehicles/[id]/parking/route.ts
// Version: 20260124
// Added: auth check for all functions
// Added: logCrud for CREATE, UPDATE, DELETE
// SECURITY: Added role-based authorization for POST, PUT, DELETE
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'

// Roles that can manage vehicle parking records
const VEHICLES_WRITE_ROLES = ['founder', 'admin', 'ceo', 'office_manager']

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

  const userRole = (session.user as any)?.role

  // Only authorized roles can create parking records
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה להוסיף חניות' }, { status: 403 })
  }

  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true }
    })
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
    
    // Logging - added
    await logCrud('CREATE', 'vehicles', 'parking', parking.id,
      `חניה ${vehicle.licensePlate} - ${data.location}`, {
      vehicleId: params.id,
      vehicleName: `${vehicle.manufacturer} ${vehicle.model}`,
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

  const userRole = (session.user as any)?.role

  // Only authorized roles can update parking records
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה לעדכן חניות' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const parkingId = searchParams.get('parkingId')
    
    if (!parkingId) {
      return NextResponse.json({ error: 'parkingId is required' }, { status: 400 })
    }
    
    const data = await request.json()
    
    // Get vehicle info for logging
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true }
    })
    
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
    
    // Logging - added
    await logCrud('UPDATE', 'vehicles', 'parking', parkingId,
      `חניה ${vehicle?.licensePlate} - ${data.location}`, {
      vehicleId: params.id,
      location: data.location,
      cost: data.cost,
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

  const userRole = (session.user as any)?.role

  // Only authorized roles can delete parking records
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה למחוק חניות' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const parkingId = searchParams.get('parkingId')
    
    if (!parkingId) {
      return NextResponse.json({ error: 'parkingId is required' }, { status: 400 })
    }
    
    // Get info for logging
    const parking = await prisma.vehicleParking.findUnique({
      where: { id: parkingId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    await prisma.vehicleParking.delete({
      where: { id: parkingId }
    })
    
    // Logging - added
    if (parking) {
      await logCrud('DELETE', 'vehicles', 'parking', parkingId,
        `חניה ${parking.vehicle.licensePlate} - ${parking.location}`, {
        vehicleId: params.id,
        location: parking.location,
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting parking:', error)
    return NextResponse.json({ error: 'Failed to delete parking' }, { status: 500 })
  }
}
