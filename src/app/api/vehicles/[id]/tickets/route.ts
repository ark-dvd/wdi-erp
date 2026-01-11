// ============================================
// src/app/api/vehicles/[id]/tickets/route.ts
// Version: 20260111-223000
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { TicketStatus } from '@prisma/client'

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

  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { id: true, licensePlate: true }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    const ticketDate = new Date(data.date)
    const employeeId = data.employeeId || await findEmployeeByDate(params.id, ticketDate)
    
    const ticket = await prisma.vehicleTicket.create({
      data: {
        vehicleId: params.id,
        date: ticketDate,
        type: data.type,
        location: data.location || null,
        description: data.description || null,
        fineAmount: parseFloat(data.fineAmount),
        points: data.points ? parseInt(data.points) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || TicketStatus.PENDING,
        fileUrl: data.fileUrl || null,
        notes: data.notes || null,
        employeeId: employeeId,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    await logCrud('CREATE', 'vehicles', 'ticket', ticket.id,
      `דוח ${data.type} - ${vehicle.licensePlate}`, {
      vehicleId: params.id,
      type: data.type,
      fineAmount: data.fineAmount,
    })
    
    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
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
    const { ticketId, ...updateData } = data
    
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 })
    }
    
    const ticket = await prisma.vehicleTicket.update({
      where: { id: ticketId },
      data: {
        date: updateData.date ? new Date(updateData.date) : undefined,
        type: updateData.type,
        location: updateData.location,
        description: updateData.description,
        fineAmount: updateData.fineAmount ? parseFloat(updateData.fineAmount) : undefined,
        points: updateData.points ? parseInt(updateData.points) : undefined,
        dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
        status: updateData.status,
        paidAmount: updateData.paidAmount ? parseFloat(updateData.paidAmount) : undefined,
        paidDate: updateData.paidDate ? new Date(updateData.paidDate) : undefined,
        fileUrl: updateData.fileUrl,
        notes: updateData.notes,
        employeeId: updateData.employeeId || undefined,
      },
      include: { 
        employee: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { licensePlate: true } }
      }
    })
    
    await logCrud('UPDATE', 'vehicles', 'ticket', ticketId,
      `דוח ${ticket.vehicle.licensePlate}`, {
      vehicleId: params.id,
      status: updateData.status,
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

  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 })
    }
    
    const ticket = await prisma.vehicleTicket.findUnique({
      where: { id: ticketId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    
    await prisma.vehicleTicket.delete({ where: { id: ticketId } })
    
    await logCrud('DELETE', 'vehicles', 'ticket', ticketId,
      `דוח ${ticket.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
  }
}
