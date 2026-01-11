// ============================================
// src/app/api/vehicles/[id]/tolls/route.ts
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
    const tolls = await prisma.vehicleTollRoad.findMany({
      where: { vehicleId: params.id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(tolls)
  } catch (error) {
    console.error('Error fetching tolls:', error)
    return NextResponse.json({ error: 'Failed to fetch tolls' }, { status: 500 })
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
    
    const tollDate = new Date(data.date)
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, tollDate)
    
    const toll = await prisma.vehicleTollRoad.create({
      data: {
        vehicleId: params.id,
        date: tollDate,
        road: data.road,
        entryPoint: data.entryPoint || null,
        exitPoint: data.exitPoint || null,
        cost: parseFloat(data.cost),
        employeeId: employeeId,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    await logCrud('CREATE', 'vehicles', 'toll', toll.id,
      `כביש אגרה ${data.road} - ${vehicle.licensePlate}`, {
      vehicleId: params.id,
      road: data.road,
      cost: data.cost,
    })
    
    return NextResponse.json(toll, { status: 201 })
  } catch (error) {
    console.error('Error creating toll:', error)
    return NextResponse.json({ error: 'Failed to create toll' }, { status: 500 })
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
    const { tollId, ...updateData } = data
    
    if (!tollId) {
      return NextResponse.json({ error: 'Missing tollId' }, { status: 400 })
    }
    
    const toll = await prisma.vehicleTollRoad.update({
      where: { id: tollId },
      data: {
        date: updateData.date ? new Date(updateData.date) : undefined,
        road: updateData.road,
        entryPoint: updateData.entryPoint,
        exitPoint: updateData.exitPoint,
        cost: updateData.cost ? parseFloat(updateData.cost) : undefined,
        employeeId: updateData.employeeId || undefined,
        notes: updateData.notes,
      },
      include: { 
        employee: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { licensePlate: true } }
      }
    })
    
    await logCrud('UPDATE', 'vehicles', 'toll', tollId,
      `כביש אגרה ${toll.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json(toll)
  } catch (error) {
    console.error('Error updating toll:', error)
    return NextResponse.json({ error: 'Failed to update toll' }, { status: 500 })
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
    const tollId = searchParams.get('tollId')
    
    if (!tollId) {
      return NextResponse.json({ error: 'Missing tollId' }, { status: 400 })
    }
    
    const toll = await prisma.vehicleTollRoad.findUnique({
      where: { id: tollId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!toll) {
      return NextResponse.json({ error: 'Toll not found' }, { status: 404 })
    }
    
    await prisma.vehicleTollRoad.delete({ where: { id: tollId } })
    
    await logCrud('DELETE', 'vehicles', 'toll', tollId,
      `כביש אגרה ${toll.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting toll:', error)
    return NextResponse.json({ error: 'Failed to delete toll' }, { status: 500 })
  }
}
