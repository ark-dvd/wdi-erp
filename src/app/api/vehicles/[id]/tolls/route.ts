// ============================================
// src/app/api/vehicles/[id]/tolls/route.ts
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
