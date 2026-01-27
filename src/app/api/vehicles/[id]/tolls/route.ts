// ============================================
// src/app/api/vehicles/[id]/tolls/route.ts
// Version: 20260124
// Added: auth check for all functions
// Added: logCrud for CREATE, UPDATE, DELETE
// SECURITY: Added role-based authorization for POST, PUT, DELETE
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'

// Roles that can manage vehicle toll records
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as any)?.role

  // Only authorized roles can create toll records
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה להוסיף נסיעות כביש אגרה' }, { status: 403 })
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
    
    // Logging - added
    await logCrud('CREATE', 'vehicles', 'toll', toll.id,
      `כביש אגרה ${vehicle.licensePlate} - ${data.road}`, {
      vehicleId: params.id,
      vehicleName: `${vehicle.manufacturer} ${vehicle.model}`,
      road: data.road,
      cost: data.cost,
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as any)?.role

  // Only authorized roles can update toll records
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה לעדכן נסיעות כביש אגרה' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const tollId = searchParams.get('tollId')
    
    if (!tollId) {
      return NextResponse.json({ error: 'tollId is required' }, { status: 400 })
    }
    
    const data = await request.json()
    
    // Get vehicle info for logging
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true }
    })
    
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
    
    // Logging - added
    await logCrud('UPDATE', 'vehicles', 'toll', tollId,
      `כביש אגרה ${vehicle?.licensePlate} - ${data.road}`, {
      vehicleId: params.id,
      road: data.road,
      cost: data.cost,
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as any)?.role

  // Only authorized roles can delete toll records
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה למחוק נסיעות כביש אגרה' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const tollId = searchParams.get('tollId')
    
    if (!tollId) {
      return NextResponse.json({ error: 'tollId is required' }, { status: 400 })
    }
    
    // Get info for logging
    const toll = await prisma.vehicleTollRoad.findUnique({
      where: { id: tollId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    await prisma.vehicleTollRoad.delete({
      where: { id: tollId }
    })
    
    // Logging - added
    if (toll) {
      await logCrud('DELETE', 'vehicles', 'toll', tollId,
        `כביש אגרה ${toll.vehicle.licensePlate} - ${toll.road}`, {
        vehicleId: params.id,
        road: toll.road,
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting toll road:', error)
    return NextResponse.json({ error: 'Failed to delete toll road' }, { status: 500 })
  }
}
