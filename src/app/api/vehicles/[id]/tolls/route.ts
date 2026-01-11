// ============================================
// src/app/api/vehicles/[id]/tolls/route.ts
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
    const tolls = await prisma.vehicleTollRoad.findMany({
      where: { vehicleId: params.id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(tolls)
  } catch (error) {
    console.error('Error fetching toll roads:', error)
    return NextResponse.json({ error: 'Failed to fetch toll roads' }, { status: 500 })
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
    
    const tollDate = new Date(data.date)
    
    // מציאת העובד שהחזיק ברכב בתאריך הנסיעה
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, tollDate)
    
    const toll = await prisma.vehicleTollRoad.create({
      data: {
        vehicleId: params.id,
        date: tollDate,
        employeeId,
        road: data.road,
        entryPoint: data.entryPoint || null,
        exitPoint: data.exitPoint || null,
        cost: parseFloat(data.cost),
        invoiceNum: data.invoiceNum || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    return NextResponse.json(toll, { status: 201 })
  } catch (error) {
    console.error('Error creating toll road:', error)
    return NextResponse.json({ error: 'Failed to create toll road' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const tollId = searchParams.get('tollId')
    
    if (!tollId) {
      return NextResponse.json({ error: 'tollId is required' }, { status: 400 })
    }
    
    const data = await request.json()
    
    const toll = await prisma.vehicleTollRoad.update({
      where: { id: tollId },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        employeeId: data.employeeId || undefined,
        road: data.road,
        entryPoint: data.entryPoint || null,
        exitPoint: data.exitPoint || null,
        cost: data.cost ? parseFloat(data.cost) : undefined,
        invoiceNum: data.invoiceNum || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    return NextResponse.json(toll)
  } catch (error) {
    console.error('Error updating toll road:', error)
    return NextResponse.json({ error: 'Failed to update toll road' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const tollId = searchParams.get('tollId')
    
    if (!tollId) {
      return NextResponse.json({ error: 'tollId is required' }, { status: 400 })
    }
    
    await prisma.vehicleTollRoad.delete({
      where: { id: tollId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting toll road:', error)
    return NextResponse.json({ error: 'Failed to delete toll road' }, { status: 500 })
  }
}
