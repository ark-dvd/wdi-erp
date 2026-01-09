// ============================================
// src/app/api/vehicles/[id]/accidents/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// פונקציית עזר - מציאת העובד שהחזיק ברכב בתאריך מסוים
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
    const accidents = await prisma.vehicleAccident.findMany({
      where: { vehicleId: params.id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(accidents)
  } catch (error) {
    console.error('Error fetching accidents:', error)
    return NextResponse.json({ error: 'Failed to fetch accidents' }, { status: 500 })
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
    
    const accidentDate = new Date(data.date)
    
    // מציאת העובד שהחזיק ברכב בתאריך התאונה
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, accidentDate)
    
    const accident = await prisma.vehicleAccident.create({
      data: {
        vehicleId: params.id,
        date: accidentDate,
        employeeId,
        location: data.location || null,
        description: data.description || null,
        thirdParty: data.thirdParty || null,
        policeReport: data.policeReport || false,
        policeFileNum: data.policeFileNum || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        insuranceClaim: data.insuranceClaim || false,
        insuranceNum: data.insuranceNum || null,
        status: data.status || 'OPEN',
        fileUrl: data.fileUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    return NextResponse.json(accident, { status: 201 })
  } catch (error) {
    console.error('Error creating accident:', error)
    return NextResponse.json({ error: 'Failed to create accident' }, { status: 500 })
  }
}
