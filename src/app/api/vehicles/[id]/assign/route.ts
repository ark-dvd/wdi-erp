// ============================================
// src/app/api/vehicles/[id]/assign/route.ts
// Version: 20260112-000000
// Added: auth check for all functions
// Added: logCrud for ASSIGN, UNASSIGN
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { employeeId, currentKm, notes } = await request.json()
    
    if (!employeeId) {
      return NextResponse.json({ error: 'חובה לבחור עובד' }, { status: 400 })
    }
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: { currentDriver: true }
    })
    
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee || employee.status !== 'פעיל') {
      return NextResponse.json({ error: 'עובד לא נמצא או לא פעיל' }, { status: 400 })
    }
    
    const existingVehicle = await prisma.vehicle.findFirst({
      where: { currentDriverId: employeeId, NOT: { id: params.id } }
    })
    if (existingVehicle) {
      return NextResponse.json(
        { error: `לעובד כבר משויך רכב: ${existingVehicle.licensePlate}` },
        { status: 400 }
      )
    }
    
    const now = new Date()
    const kmValue = currentKm ? parseInt(currentKm) : vehicle.currentKm
    const previousDriverName = vehicle.currentDriver 
      ? `${vehicle.currentDriver.firstName} ${vehicle.currentDriver.lastName}`
      : null
    
    await prisma.$transaction(async (tx) => {
      if (vehicle.currentDriverId) {
        await tx.vehicleAssignment.updateMany({
          where: { vehicleId: params.id, employeeId: vehicle.currentDriverId, endDate: null },
          data: { endDate: now, endKm: kmValue }
        })
      }
      
      await tx.vehicleAssignment.create({
        data: {
          vehicleId: params.id,
          employeeId,
          startDate: now,
          startKm: kmValue,
          notes: notes || null,
        }
      })
      
      await tx.vehicle.update({
        where: { id: params.id },
        data: { currentDriverId: employeeId, currentKm: kmValue }
      })
    })
    
    const updatedVehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: { currentDriver: { select: { id: true, firstName: true, lastName: true, phone: true } } }
    })
    
    // Logging - added
    await logCrud('CREATE', 'vehicles', 'assignment', params.id,
      `שיוך ${vehicle.licensePlate} ל${employee.firstName} ${employee.lastName}`, {
      vehicleId: params.id,
      licensePlate: vehicle.licensePlate,
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      previousDriver: previousDriverName,
      startKm: kmValue,
    })
    
    return NextResponse.json(updatedVehicle)
  } catch (error) {
    console.error('Error assigning vehicle:', error)
    return NextResponse.json({ error: 'Failed to assign vehicle' }, { status: 500 })
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
    const { currentKm, notes } = await request.json().catch(() => ({}))
    
    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id: params.id },
      include: { currentDriver: { select: { firstName: true, lastName: true } } }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    if (!vehicle.currentDriverId) {
      return NextResponse.json({ error: 'הרכב לא משויך לאף עובד' }, { status: 400 })
    }
    
    const driverName = vehicle.currentDriver 
      ? `${vehicle.currentDriver.firstName} ${vehicle.currentDriver.lastName}`
      : 'unknown'
    
    const now = new Date()
    const kmValue = currentKm ? parseInt(currentKm) : vehicle.currentKm
    
    await prisma.$transaction(async (tx) => {
      await tx.vehicleAssignment.updateMany({
        where: { vehicleId: params.id, employeeId: vehicle.currentDriverId!, endDate: null },
        data: { endDate: now, endKm: kmValue, notes: notes ? `${notes} (ביטול שיוך)` : 'ביטול שיוך' }
      })
      
      await tx.vehicle.update({
        where: { id: params.id },
        data: { currentDriverId: null, currentKm: kmValue }
      })
    })
    
    // Logging - added
    await logCrud('DELETE', 'vehicles', 'assignment', params.id,
      `ביטול שיוך ${vehicle.licensePlate} מ${driverName}`, {
      vehicleId: params.id,
      licensePlate: vehicle.licensePlate,
      previousDriver: driverName,
      endKm: kmValue,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unassigning vehicle:', error)
    return NextResponse.json({ error: 'Failed to unassign vehicle' }, { status: 500 })
  }
}
