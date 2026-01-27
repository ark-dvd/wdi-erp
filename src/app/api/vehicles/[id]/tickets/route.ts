// ============================================
// src/app/api/vehicles/[id]/tickets/route.ts
// Version: 20260124
// Added: auth check for all functions
// Added: logCrud for CREATE, UPDATE, DELETE
// SECURITY: Added role-based authorization for POST, PUT, DELETE
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'
import { TicketStatus } from '@prisma/client'

// Roles that can manage vehicle tickets
const VEHICLES_WRITE_ROLES = ['owner', 'executive', 'trust_officer', 'administration']

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

  try {
    const tickets = await prisma.vehicleTicket.findMany({
      where: { vehicleId: params.id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
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

  const userRole = (session.user as any)?.role

  // Only authorized roles can create tickets
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה להוסיף דוחות' }, { status: 403 })
  }

  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    const ticketDate = new Date(data.date)
    
    // מציאת העובד שהחזיק ברכב בתאריך העבירה
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, ticketDate)
    
    const ticket = await prisma.vehicleTicket.create({
      data: {
        vehicleId: params.id,
        date: ticketDate,
        employeeId,
        ticketType: data.ticketType,
        ticketNumber: data.ticketNumber || null,
        location: data.location || null,
        description: data.description || null,
        fineAmount: parseFloat(data.fineAmount),
        points: data.points ? parseInt(data.points) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || TicketStatus.PENDING,
        fileUrl: data.fileUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    // Logging - added
    await logCrud('CREATE', 'vehicles', 'ticket', ticket.id,
      `דוח ${vehicle.licensePlate} - ${data.ticketType}`, {
      vehicleId: params.id,
      vehicleName: `${vehicle.manufacturer} ${vehicle.model}`,
      ticketType: data.ticketType,
      fineAmount: data.fineAmount,
      location: data.location,
    })
    
    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}

// עדכון סטטוס דוח (תשלום/ערעור)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as any)?.role

  // Only authorized roles can update tickets
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה לעדכן דוחות' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    const data = await request.json()
    
    // תמיכה גם בפורמט הישן (ticketId בגוף הבקשה) וגם החדש (ב-query string)
    const id = ticketId || data.ticketId
    if (!id) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
    }
    
    // Get vehicle info for logging
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true }
    })
    
    const ticket = await prisma.vehicleTicket.update({
      where: { id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        employeeId: data.employeeId || undefined,
        ticketType: data.ticketType || undefined,
        ticketNumber: data.ticketNumber || null,
        location: data.location || null,
        description: data.description || null,
        fineAmount: data.fineAmount ? parseFloat(data.fineAmount) : undefined,
        points: data.points ? parseInt(data.points) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || undefined,
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
        paidAmount: data.paidAmount ? parseFloat(data.paidAmount) : null,
        appealDate: data.appealDate ? new Date(data.appealDate) : null,
        appealResult: data.appealResult || null,
        fileUrl: data.fileUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    // Logging - added
    await logCrud('UPDATE', 'vehicles', 'ticket', id,
      `דוח ${vehicle?.licensePlate} - ${data.ticketType || ticket.ticketType}`, {
      vehicleId: params.id,
      ticketType: data.ticketType || ticket.ticketType,
      status: data.status,
      fineAmount: data.fineAmount,
    })
    
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
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

  const userRole = (session.user as any)?.role

  // Only authorized roles can delete tickets
  if (!VEHICLES_WRITE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'אין הרשאה למחוק דוחות' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
    }
    
    // Get info for logging
    const ticket = await prisma.vehicleTicket.findUnique({
      where: { id: ticketId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    await prisma.vehicleTicket.delete({
      where: { id: ticketId }
    })
    
    // Logging - added
    if (ticket) {
      await logCrud('DELETE', 'vehicles', 'ticket', ticketId,
        `דוח ${ticket.vehicle.licensePlate} - ${ticket.ticketType}`, {
        vehicleId: params.id,
        ticketType: ticket.ticketType,
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
  }
}
