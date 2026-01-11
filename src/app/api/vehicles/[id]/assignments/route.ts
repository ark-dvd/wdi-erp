// ============================================
// src/app/api/vehicles/[id]/assignments/route.ts
// Version: 20260111-220000
// Fixed: proper try/catch structure with auth
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const assignments = await prisma.vehicleAssignment.findMany({
      where: { vehicleId: params.id },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true }
        }
      },
      orderBy: { startDate: 'desc' }
    })
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
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
    
    if (!data.employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 })
    }
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true }
    })
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    const existingAssignments = await prisma.vehicleAssignment.findMany({
      where: {
        vehicleId: params.id,
        endDate: null
      }
    })
    
    if (existingAssignments.length > 0) {
      await prisma.vehicleAssignment.updateMany({
        where: {
          vehicleId: params.id,
          endDate: null
        },
        data: {
          endDate: data.startDate ? new Date(data.startDate) : new Date(),
          endKm: data.startKm || null
        }
      })
    }
    
    const assignment = await prisma.vehicleAssignment.create({
      data: {
        vehicleId: params.id,
        employeeId: data.employeeId,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        startKm: data.startKm || null,
        notes: data.notes || null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true }
        }
      }
    })
    
    await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        currentDriverId: data.employeeId,
        currentKm: data.startKm || undefined
      }
    })
    
    await logCrud('CREATE', 'vehicles', 'assignment', assignment.id,
      `שיוך ${vehicle.licensePlate} ל-${employee.firstName} ${employee.lastName}`, {
      vehicleId: params.id,
      employeeId: data.employeeId,
    })
    
    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
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
    const { assignmentId, ...updateData } = data
    
    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 })
    }
    
    const existingAssignment = await prisma.vehicleAssignment.findUnique({
      where: { id: assignmentId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }
    
    const assignment = await prisma.vehicleAssignment.update({
      where: { id: assignmentId },
      data: {
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : updateData.endDate === null ? null : undefined,
        startKm: updateData.startKm,
        endKm: updateData.endKm,
        notes: updateData.notes,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true }
        }
      }
    })
    
    if (updateData.endDate) {
      const otherAssignments = await prisma.vehicleAssignment.findMany({
        where: {
          vehicleId: params.id,
          endDate: null,
          id: { not: assignmentId }
        }
      })
      
      if (otherAssignments.length === 0) {
        await prisma.vehicle.update({
          where: { id: params.id },
          data: { currentDriverId: null }
        })
      }
    }
    
    await logCrud('UPDATE', 'vehicles', 'assignment', assignmentId,
      `עדכון שיוך ${existingAssignment.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Error updating assignment:', error)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
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
    const assignmentId = searchParams.get('assignmentId')
    
    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 })
    }
    
    const assignment = await prisma.vehicleAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        vehicle: { select: { licensePlate: true, currentDriverId: true } },
        employee: { select: { firstName: true, lastName: true } }
      }
    })
    
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }
    
    await prisma.vehicleAssignment.delete({ where: { id: assignmentId } })
    
    if (assignment.vehicle.currentDriverId === assignment.employeeId && !assignment.endDate) {
      await prisma.vehicle.update({
        where: { id: params.id },
        data: { currentDriverId: null }
      })
    }
    
    await logCrud('DELETE', 'vehicles', 'assignment', assignmentId,
      `מחיקת שיוך ${assignment.vehicle.licensePlate}`, {
      vehicleId: params.id,
      employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
  }
}
