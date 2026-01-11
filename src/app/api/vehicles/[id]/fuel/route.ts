// ============================================
// src/app/api/vehicles/[id]/fuel/route.ts
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

  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { id: true, licensePlate: true, manufacturer: true, model: true }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    const fuelDate = new Date(data.date)
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, fuelDate)
    
    const fuelLog = await prisma.vehicleFuelLog.create({
      data: {
        vehicleId: params.id,
        date: fuelDate,
        liters: parseFloat(data.liters),
        pricePerLiter: parseFloat(data.pricePerLiter),
        totalCost: parseFloat(data.totalCost),
        odometer: data.odometer ? parseInt(data.odometer) : null,
        station: data.station || null,
        fuelType: data.fuelType || null,
        employeeId: employeeId,
        receiptUrl: data.receiptUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    if (data.odometer) {
      await prisma.vehicle.update({
        where: { id: params.id },
        data: { currentKm: parseInt(data.odometer) }
      })
    }
    
    await logCrud('CREATE', 'vehicles', 'fuel', fuelLog.id,
      `תדלוק ${vehicle.licensePlate}`, {
      vehicleId: params.id,
      liters: data.liters,
      totalCost: data.totalCost,
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

  try {
    const data = await request.json()
    const { fuelLogId, ...updateData } = data
    
    if (!fuelLogId) {
      return NextResponse.json({ error: 'Missing fuelLogId' }, { status: 400 })
    }
    
    const fuelLog = await prisma.vehicleFuelLog.update({
      where: { id: fuelLogId },
      data: {
        date: updateData.date ? new Date(updateData.date) : undefined,
        liters: updateData.liters ? parseFloat(updateData.liters) : undefined,
        pricePerLiter: updateData.pricePerLiter ? parseFloat(updateData.pricePerLiter) : undefined,
        totalCost: updateData.totalCost ? parseFloat(updateData.totalCost) : undefined,
        odometer: updateData.odometer ? parseInt(updateData.odometer) : undefined,
        station: updateData.station,
        fuelType: updateData.fuelType,
        employeeId: updateData.employeeId || undefined,
        receiptUrl: updateData.receiptUrl,
        notes: updateData.notes,
      },
      include: { 
        employee: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { licensePlate: true } }
      }
    })
    
    await logCrud('UPDATE', 'vehicles', 'fuel', fuelLogId,
      `תדלוק ${fuelLog.vehicle.licensePlate}`, {
      vehicleId: params.id,
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

  try {
    const { searchParams } = new URL(request.url)
    const fuelLogId = searchParams.get('fuelLogId')
    
    if (!fuelLogId) {
      return NextResponse.json({ error: 'Missing fuelLogId' }, { status: 400 })
    }
    
    const fuelLog = await prisma.vehicleFuelLog.findUnique({
      where: { id: fuelLogId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!fuelLog) {
      return NextResponse.json({ error: 'Fuel log not found' }, { status: 404 })
    }
    
    await prisma.vehicleFuelLog.delete({ where: { id: fuelLogId } })
    
    await logCrud('DELETE', 'vehicles', 'fuel', fuelLogId,
      `תדלוק ${fuelLog.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fuel log:', error)
    return NextResponse.json({ error: 'Failed to delete fuel log' }, { status: 500 })
  }
}
