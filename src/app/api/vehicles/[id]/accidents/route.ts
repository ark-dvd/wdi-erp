// ============================================
// src/app/api/vehicles/[id]/accidents/route.ts
// Version: 20260111-220000
// Fixed: proper try/catch structure with auth
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { AccidentStatus } from '@prisma/client'

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
    
    const accidentDate = new Date(data.date)
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, accidentDate)
    
    const accident = await prisma.vehicleAccident.create({
      data: {
        vehicleId: params.id,
        date: accidentDate,
        location: data.location,
        description: data.description,
        employeeId: employeeId,
        thirdParty: data.thirdParty || false,
        thirdPartyDetails: data.thirdPartyDetails || null,
        policeReport: data.policeReport || false,
        policeReportNum: data.policeReportNum || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        insuranceClaim: data.insuranceClaim || false,
        insuranceNum: data.insuranceNum || null,
        status: data.status || AccidentStatus.OPEN,
        fileUrl: data.fileUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    await logCrud('CREATE', 'vehicles', 'accident', accident.id,
      `תאונה ${vehicle.licensePlate}`, {
      vehicleId: params.id,
      vehicleName: `${vehicle.manufacturer} ${vehicle.model}`,
      location: data.location,
      cost: data.cost,
      status: data.status || AccidentStatus.OPEN,
    })
    
    return NextResponse.json(accident, { status: 201 })
  } catch (error) {
    console.error('Error creating accident:', error)
    return NextResponse.json({ error: 'Failed to create accident' }, { status: 500 })
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
    const { accidentId, ...updateData } = data
    
    if (!accidentId) {
      return NextResponse.json({ error: 'Missing accidentId' }, { status: 400 })
    }
    
    const accident = await prisma.vehicleAccident.update({
      where: { id: accidentId },
      data: {
        date: updateData.date ? new Date(updateData.date) : undefined,
        location: updateData.location,
        description: updateData.description,
        employeeId: updateData.employeeId || undefined,
        thirdParty: updateData.thirdParty,
        thirdPartyDetails: updateData.thirdPartyDetails,
        policeReport: updateData.policeReport,
        policeReportNum: updateData.policeReportNum,
        cost: updateData.cost ? parseFloat(updateData.cost) : undefined,
        insuranceClaim: updateData.insuranceClaim,
        insuranceNum: updateData.insuranceNum,
        status: updateData.status,
        fileUrl: updateData.fileUrl,
        notes: updateData.notes,
      },
      include: { 
        employee: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { licensePlate: true, manufacturer: true, model: true } }
      }
    })
    
    await logCrud('UPDATE', 'vehicles', 'accident', accidentId,
      `תאונה ${accident.vehicle.licensePlate}`, {
      vehicleId: params.id,
      status: updateData.status,
    })
    
    return NextResponse.json(accident)
  } catch (error) {
    console.error('Error updating accident:', error)
    return NextResponse.json({ error: 'Failed to update accident' }, { status: 500 })
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
    const accidentId = searchParams.get('accidentId')
    
    if (!accidentId) {
      return NextResponse.json({ error: 'Missing accidentId' }, { status: 400 })
    }
    
    const accident = await prisma.vehicleAccident.findUnique({
      where: { id: accidentId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!accident) {
      return NextResponse.json({ error: 'Accident not found' }, { status: 404 })
    }
    
    await prisma.vehicleAccident.delete({ where: { id: accidentId } })
    
    await logCrud('DELETE', 'vehicles', 'accident', accidentId,
      `תאונה ${accident.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting accident:', error)
    return NextResponse.json({ error: 'Failed to delete accident' }, { status: 500 })
  }
}
