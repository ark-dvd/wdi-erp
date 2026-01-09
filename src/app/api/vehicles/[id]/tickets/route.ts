// ============================================
// src/app/api/vehicles/[id]/tickets/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } })
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
        status: data.status || 'PENDING',
        fileUrl: data.fileUrl || null,
        notes: data.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
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
  try {
    const data = await request.json()
    const { ticketId, ...updateData } = data
    
    const ticket = await prisma.vehicleTicket.update({
      where: { id: ticketId },
      data: {
        status: updateData.status,
        paidDate: updateData.paidDate ? new Date(updateData.paidDate) : null,
        paidAmount: updateData.paidAmount ? parseFloat(updateData.paidAmount) : null,
        appealDate: updateData.appealDate ? new Date(updateData.appealDate) : null,
        appealResult: updateData.appealResult || null,
        notes: updateData.notes || null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } }
    })
    
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}
