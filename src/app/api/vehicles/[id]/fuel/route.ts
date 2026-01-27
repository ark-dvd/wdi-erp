// ============================================
// src/app/api/vehicles/[id]/fuel/route.ts
// Version: 20260124
// Added: auth check for all functions
// Added: logCrud for CREATE, UPDATE, DELETE
// SECURITY: Added role-based authorization for POST, PUT, DELETE
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'

// Roles that can manage vehicle fuel logs
const VEHICLES_WRITE_ROLES = ['owner', 'executive', 'trust_officer', 'administration']

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
    const fuelLogs = await prisma.vehicleFuelLog.findMany({
      where: { vehicleId: params.id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(fuelLogs)
  } catch (error) {
    console.error('Error fetching fuel logs:', error)
    return NextResponse.json({ error: 'Failed to fetch fuel logs' }, { status: 500 })
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

  // Only authorized roles can create fuel logs
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה להוסיף תדלוקים' }, { status: 403 })
  }

  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true, currentKm: true }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    const fuelDate = new Date(data.date)
    const liters = parseFloat(data.liters)
    const totalCost = data.totalCost ? parseFloat(data.totalCost) : 0
    const pricePerLiter = data.pricePerLiter ? parseFloat(data.pricePerLiter) : (totalCost && liters ? totalCost / liters : null)
    const mileage = data.mileage ? parseInt(data.mileage) : null
    
    // מציאת העובד שהחזיק ברכב בתאריך התדלוק
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, fuelDate)
    
    const fuelLog = await prisma.vehicleFuelLog.create({
      data: {
        vehicleId: params.id,
        date: fuelDate,
        employeeId,
        liters,
        pricePerLiter,
        totalCost,
        mileage,
        station: data.station || null,
        fuelType: data.fuelType || null,
        fullTank: data.fullTank !== false,
        receiptUrl: data.receiptUrl || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    if (mileage && (!vehicle.currentKm || mileage > vehicle.currentKm)) {
      await prisma.vehicle.update({ where: { id: params.id }, data: { currentKm: mileage } })
    }
    
    // Logging - added
    await logCrud('CREATE', 'vehicles', 'fuel-log', fuelLog.id,
      `תדלוק ${vehicle.licensePlate} - ${liters}L`, {
      vehicleId: params.id,
      vehicleName: `${vehicle.manufacturer} ${vehicle.model}`,
      liters,
      totalCost,
      station: data.station,
    })
    
    return NextResponse.json(fuelLog, { status: 201 })
  } catch (error) {
    console.error('Error creating fuel log:', error)
    return NextResponse.json({ error: 'Failed to create fuel log' }, { status: 500 })
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

  // Only authorized roles can update fuel logs
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה לעדכן תדלוקים' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const fuelId = searchParams.get('fuelId')
    
    if (!fuelId) {
      return NextResponse.json({ error: 'fuelId is required' }, { status: 400 })
    }
    
    const data = await request.json()
    const liters = data.liters ? parseFloat(data.liters) : undefined
    const totalCost = data.totalCost ? parseFloat(data.totalCost) : undefined
    const pricePerLiter = data.pricePerLiter ? parseFloat(data.pricePerLiter) : (totalCost && liters ? totalCost / liters : undefined)
    
    // Get vehicle info for logging
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true }
    })
    
    const fuelLog = await prisma.vehicleFuelLog.update({
      where: { id: fuelId },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        employeeId: data.employeeId || undefined,
        liters,
        pricePerLiter,
        totalCost,
        mileage: data.mileage ? parseInt(data.mileage) : null,
        station: data.station || null,
        fuelType: data.fuelType || null,
        fullTank: data.fullTank !== false,
        receiptUrl: data.receiptUrl || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    // Logging - added
    await logCrud('UPDATE', 'vehicles', 'fuel-log', fuelId,
      `תדלוק ${vehicle?.licensePlate}`, {
      vehicleId: params.id,
      liters,
      totalCost,
    })
    
    return NextResponse.json(fuelLog)
  } catch (error) {
    console.error('Error updating fuel log:', error)
    return NextResponse.json({ error: 'Failed to update fuel log' }, { status: 500 })
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

  // Only authorized roles can delete fuel logs
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה למחוק תדלוקים' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const fuelId = searchParams.get('fuelId')
    
    if (!fuelId) {
      return NextResponse.json({ error: 'fuelId is required' }, { status: 400 })
    }
    
    // Get info for logging
    const fuelLog = await prisma.vehicleFuelLog.findUnique({
      where: { id: fuelId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    await prisma.vehicleFuelLog.delete({
      where: { id: fuelId }
    })
    
    // Logging - added
    if (fuelLog) {
      await logCrud('DELETE', 'vehicles', 'fuel-log', fuelId,
        `תדלוק ${fuelLog.vehicle.licensePlate}`, {
        vehicleId: params.id,
        liters: fuelLog.liters,
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fuel log:', error)
    return NextResponse.json({ error: 'Failed to delete fuel log' }, { status: 500 })
  }
}
