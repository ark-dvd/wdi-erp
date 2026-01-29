// ============================================
// src/app/api/vehicles/[id]/assignments/route.ts
// Version: 20260112-000000
// Added: auth check for all functions
// Added: logCrud for CREATE, UPDATE, DELETE
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  try {
    const assignments = await prisma.vehicleAssignment.findMany({
      where: { vehicleId: params.id },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true }
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
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    if (!data.employeeId) {
      return NextResponse.json({ error: 'חובה לבחור עובד' }, { status: 400 })
    }
    if (!data.startDate) {
      return NextResponse.json({ error: 'חובה להזין תאריך ושעת התחלה' }, { status: 400 })
    }
    
    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
    if (!employee) {
      return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 })
    }
    
    const startDate = new Date(data.startDate)
    const endDate = data.endDate ? new Date(data.endDate) : null
    
    if (endDate && endDate <= startDate) {
      return NextResponse.json({ error: 'תאריך ושעת סיום חייבים להיות אחרי תאריך ושעת ההתחלה' }, { status: 400 })
    }
    
    const existingAssignments = await prisma.vehicleAssignment.findMany({
      where: { vehicleId: params.id },
      select: { id: true, startDate: true, endDate: true, employee: { select: { firstName: true, lastName: true } } }
    })
    
    for (const existing of existingAssignments) {
      const existingStart = new Date(existing.startDate)
      const existingEnd = existing.endDate ? new Date(existing.endDate) : null
      
      const newEndsAfterExistingStarts = !endDate || endDate > existingStart
      const newStartsBeforeExistingEnds = !existingEnd || startDate < existingEnd
      
      if (newStartsBeforeExistingEnds && newEndsAfterExistingStarts) {
        const employeeName = `${existing.employee.firstName} ${existing.employee.lastName}`
        const existingStartStr = existingStart.toLocaleDateString('he-IL') + ' ' + existingStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        const existingEndStr = existingEnd 
          ? existingEnd.toLocaleDateString('he-IL') + ' ' + existingEnd.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
          : 'עד היום'
        return NextResponse.json({ 
          error: `חפיפה בתאריכים עם שיוך קיים: ${employeeName} (${existingStartStr} - ${existingEndStr})` 
        }, { status: 400 })
      }
    }
    
    const assignment = await prisma.vehicleAssignment.create({
      data: {
        vehicleId: params.id,
        employeeId: data.employeeId,
        startDate,
        endDate,
        startKm: data.startKm ? parseInt(data.startKm) : null,
        endKm: data.endKm ? parseInt(data.endKm) : null,
        notes: data.notes || null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true }
        }
      }
    })
    
    const now = new Date()
    if (!endDate && startDate <= now) {
      const laterActiveAssignment = await prisma.vehicleAssignment.findFirst({
        where: {
          vehicleId: params.id,
          endDate: null,
          startDate: { gt: startDate },
          id: { not: assignment.id }
        }
      })
      
      if (!laterActiveAssignment) {
        await prisma.vehicle.update({
          where: { id: params.id },
          data: { currentDriverId: data.employeeId }
        })
      }
    }
    
    // Logging - added
    await logCrud('CREATE', 'vehicles', 'assignment-history', assignment.id,
      `שיוך היסטורי ${vehicle.licensePlate} - ${employee.firstName} ${employee.lastName}`, {
      vehicleId: params.id,
      licensePlate: vehicle.licensePlate,
      employeeName: `${employee.firstName} ${employee.lastName}`,
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
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    if (!data.assignmentId) {
      return NextResponse.json({ error: 'חסר מזהה שיוך' }, { status: 400 })
    }
    
    const existingAssignment = await prisma.vehicleAssignment.findUnique({
      where: { id: data.assignmentId },
      include: { employee: { select: { firstName: true, lastName: true } } }
    })
    
    if (!existingAssignment || existingAssignment.vehicleId !== params.id) {
      return NextResponse.json({ error: 'שיוך לא נמצא' }, { status: 404 })
    }
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true }
    })
    
    const startDate = data.startDate ? new Date(data.startDate) : existingAssignment.startDate
    const endDate = data.endDate ? new Date(data.endDate) : (data.endDate === null ? null : existingAssignment.endDate)
    
    if (endDate && endDate <= startDate) {
      return NextResponse.json({ error: 'תאריך ושעת סיום חייבים להיות אחרי תאריך ושעת ההתחלה' }, { status: 400 })
    }
    
    const otherAssignments = await prisma.vehicleAssignment.findMany({
      where: { 
        vehicleId: params.id,
        id: { not: data.assignmentId }
      },
      select: { id: true, startDate: true, endDate: true, employee: { select: { firstName: true, lastName: true } } }
    })
    
    for (const existing of otherAssignments) {
      const existingStart = new Date(existing.startDate)
      const existingEnd = existing.endDate ? new Date(existing.endDate) : null
      
      const newEndsAfterExistingStarts = !endDate || endDate > existingStart
      const newStartsBeforeExistingEnds = !existingEnd || startDate < existingEnd
      
      if (newStartsBeforeExistingEnds && newEndsAfterExistingStarts) {
        const employeeName = `${existing.employee.firstName} ${existing.employee.lastName}`
        const existingStartStr = existingStart.toLocaleDateString('he-IL') + ' ' + existingStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        const existingEndStr = existingEnd 
          ? existingEnd.toLocaleDateString('he-IL') + ' ' + existingEnd.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
          : 'עד היום'
        return NextResponse.json({ 
          error: `חפיפה בתאריכים עם שיוך קיים: ${employeeName} (${existingStartStr} - ${existingEndStr})` 
        }, { status: 400 })
      }
    }
    
    const updatedAssignment = await prisma.vehicleAssignment.update({
      where: { id: data.assignmentId },
      data: {
        employeeId: data.employeeId || existingAssignment.employeeId,
        startDate,
        endDate,
        startKm: data.startKm !== undefined ? (data.startKm ? parseInt(data.startKm) : null) : existingAssignment.startKm,
        endKm: data.endKm !== undefined ? (data.endKm ? parseInt(data.endKm) : null) : existingAssignment.endKm,
        notes: data.notes !== undefined ? (data.notes || null) : existingAssignment.notes,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true }
        }
      }
    })
    
    // Logging - added
    await logCrud('UPDATE', 'vehicles', 'assignment-history', data.assignmentId,
      `עדכון שיוך ${vehicle?.licensePlate} - ${existingAssignment.employee.firstName} ${existingAssignment.employee.lastName}`, {
      vehicleId: params.id,
      licensePlate: vehicle?.licensePlate,
      employeeName: `${existingAssignment.employee.firstName} ${existingAssignment.employee.lastName}`,
    })
    
    return NextResponse.json(updatedAssignment)
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
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')
    
    if (!assignmentId) {
      return NextResponse.json({ error: 'חסר מזהה שיוך' }, { status: 400 })
    }
    
    const assignment = await prisma.vehicleAssignment.findUnique({
      where: { id: assignmentId },
      include: { 
        employee: { select: { firstName: true, lastName: true } },
        vehicle: { select: { licensePlate: true } }
      }
    })
    
    if (!assignment || assignment.vehicleId !== params.id) {
      return NextResponse.json({ error: 'שיוך לא נמצא' }, { status: 404 })
    }
    
    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } })
    if (vehicle?.currentDriverId === assignment.employeeId && !assignment.endDate) {
      await prisma.vehicle.update({
        where: { id: params.id },
        data: { currentDriverId: null }
      })
    }
    
    await prisma.vehicleAssignment.delete({
      where: { id: assignmentId }
    })
    
    // Logging - added
    await logCrud('DELETE', 'vehicles', 'assignment-history', assignmentId,
      `מחיקת שיוך ${assignment.vehicle.licensePlate} - ${assignment.employee.firstName} ${assignment.employee.lastName}`, {
      vehicleId: params.id,
      licensePlate: assignment.vehicle.licensePlate,
      employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
  }
}
