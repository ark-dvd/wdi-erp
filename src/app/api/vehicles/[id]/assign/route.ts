// ============================================
// src/app/api/vehicles/[id]/assign/route.ts
// Version: 20260111-220000
// Fixed: proper try/catch structure with auth
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

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
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 })
    }
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: { currentDriver: true }
    })
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    if (vehicle.currentDriverId) {
      await prisma.vehicleAssignment.updateMany({
        where: {
          vehicleId: params.id,
          endDate: null
        },
        data: {
          endDate: new Date(),
          endKm: currentKm || vehicle.currentKm
        }
      })
    }
    
    await prisma.vehicleAssignment.create({
      data: {
        vehicleId: params.id,
        employeeId: employeeId,
        startDate: new Date(),
        startKm: currentKm || vehicle.currentKm || 0,
        notes: notes || null
      }
    })
    
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        currentDriverId: employeeId,
        currentKm: currentKm || vehicle.currentKm
      },
      include: {
        currentDriver: {
          select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true }
        }
      }
    })
    
    await logCrud('UPDATE', 'vehicles', 'assignment', params.id,
      `שיוך ${vehicle.licensePlate} ל-${employee.firstName} ${employee.lastName}`, {
      vehicleId: params.id,
      employeeId: employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
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
    const { currentKm } = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: { currentDriver: true }
    })
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    if (!vehicle.currentDriverId) {
      return NextResponse.json({ error: 'Vehicle has no current driver' }, { status: 400 })
    }
    
    await prisma.vehicleAssignment.updateMany({
      where: {
        vehicleId: params.id,
        endDate: null
      },
      data: {
        endDate: new Date(),
        endKm: currentKm || vehicle.currentKm
      }
    })
    
    const previousDriver = vehicle.currentDriver
    
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        currentDriverId: null,
        currentKm: currentKm || vehicle.currentKm
      }
    })
    
    await logCrud('UPDATE', 'vehicles', 'unassignment', params.id,
      `ביטול שיוך ${vehicle.licensePlate}`, {
      vehicleId: params.id,
      previousDriverId: previousDriver?.id,
      previousDriverName: previousDriver ? `${previousDriver.firstName} ${previousDriver.lastName}` : null,
    })
    
    return NextResponse.json(updatedVehicle)
  } catch (error) {
    console.error('Error unassigning vehicle:', error)
    return NextResponse.json({ error: 'Failed to unassign vehicle' }, { status: 500 })
  }
}
