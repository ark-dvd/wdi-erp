// ============================================
// src/app/api/vehicles/[id]/accidents/route.ts
// Version: 20260111-210500
// Added: logCrud for CREATE, UPDATE, DELETE
// Fixed: AccidentStatus enum instead of hardcoded strings
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { AccidentStatus } from '@prisma/client'

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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }


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


    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true }
    })
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
        status: data.status || AccidentStatus.OPEN,
        fileUrl: data.fileUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    // Logging - added
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


    const { searchParams } = new URL(request.url)
    const accidentId = searchParams.get('accidentId')
    
    if (!accidentId) {
      return NextResponse.json({ error: 'accidentId is required' }, { status: 400 })
    }
    
    const data = await request.json()
    
    // Get vehicle info for logging
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true }
    })
    
    const accident = await prisma.vehicleAccident.update({
      where: { id: accidentId },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        employeeId: data.employeeId || undefined,
        location: data.location || null,
        description: data.description || null,
        thirdParty: data.thirdParty || null,
        policeReport: data.policeReport || false,
        policeFileNum: data.policeFileNum || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        insuranceClaim: data.insuranceClaim || false,
        insuranceNum: data.insuranceNum || null,
        status: data.status || undefined,
        fileUrl: data.fileUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    // Logging - added
    await logCrud('UPDATE', 'vehicles', 'accident', accidentId,
      `תאונה ${vehicle?.licensePlate}`, {
      vehicleId: params.id,
      status: data.status,
      cost: data.cost,
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


    const { searchParams } = new URL(request.url)
    const accidentId = searchParams.get('accidentId')
    
    if (!accidentId) {
      return NextResponse.json({ error: 'accidentId is required' }, { status: 400 })
    }
    
    // Get info for logging
    const accident = await prisma.vehicleAccident.findUnique({
      where: { id: accidentId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    await prisma.vehicleAccident.delete({
      where: { id: accidentId }
    })
    
    // Logging - added
    if (accident) {
      await logCrud('DELETE', 'vehicles', 'accident', accidentId,
        `תאונה ${accident.vehicle.licensePlate}`, {
        vehicleId: params.id,
        location: accident.location,
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting accident:', error)
    return NextResponse.json({ error: 'Failed to delete accident' }, { status: 500 })
  }
}
