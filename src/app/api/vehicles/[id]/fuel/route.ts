// ============================================
// src/app/api/vehicles/[id]/fuel/route.ts
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
  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } })
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
    
    return NextResponse.json(fuelLog, { status: 201 })
  } catch (error) {
    console.error('Error creating fuel log:', error)
    return NextResponse.json({ error: 'Failed to create fuel log' }, { status: 500 })
  }
}
