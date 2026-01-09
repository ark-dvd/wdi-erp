// ============================================
// src/app/api/vehicles/[id]/assign/route.ts
// POST - שיוך רכב לעובד חדש
// DELETE - ביטול שיוך
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
  try {
    const { currentKm, notes } = await request.json().catch(() => ({}))
    
    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } })
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    if (!vehicle.currentDriverId) {
      return NextResponse.json({ error: 'הרכב לא משויך לאף עובד' }, { status: 400 })
    }
    
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
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unassigning vehicle:', error)
    return NextResponse.json({ error: 'Failed to unassign vehicle' }, { status: 500 })
  }
}
