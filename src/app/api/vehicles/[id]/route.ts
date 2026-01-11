// ============================================
// src/app/api/vehicles/[id]/route.ts
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
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        currentDriver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            photoUrl: true,
            role: true,
          }
        },
        assignments: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true }
            }
          },
          orderBy: { startDate: 'desc' },
          take: 10
        },
        fuelLogs: {
          orderBy: { date: 'desc' },
          take: 50
        },
        services: {
          orderBy: { serviceDate: 'desc' },
          take: 20
        },
        accidents: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { date: 'desc' }
        },
        tickets: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { date: 'desc' }
        },
        tollRoads: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { date: 'desc' },
          take: 50
        },
        parkings: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { date: 'desc' },
          take: 50
        },
        documents: {
          orderBy: [{ type: 'asc' }, { expiryDate: 'desc' }]
        },
        photos: {
          orderBy: [{ event: 'asc' }, { createdAt: 'desc' }]
        }
      }
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const stats = {
      totalFuelCost: vehicle.fuelLogs.reduce((sum, log) => sum + log.totalCost, 0),
      totalServiceCost: vehicle.services.reduce((sum, s) => sum + (s.cost || 0), 0),
      totalAccidentCost: vehicle.accidents.reduce((sum, a) => sum + (a.cost || 0), 0),
      totalTollCost: vehicle.tollRoads.reduce((sum, t) => sum + t.cost, 0),
      totalParkingCost: vehicle.parkings.reduce((sum, p) => sum + p.cost, 0),
      totalTicketsCost: vehicle.tickets.reduce((sum, t) => sum + (t.paidAmount || t.fineAmount || 0), 0),
      pendingTickets: vehicle.tickets.filter(t => t.status === TicketStatus.PENDING).length,
      totalFuelLiters: vehicle.fuelLogs.reduce((sum, log) => sum + log.liters, 0),
      avgFuelConsumption: 0,
    }

    return NextResponse.json({ ...vehicle, stats })
  } catch (error) {
    console.error('Error fetching vehicle:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicle' }, { status: 500 })
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
    
    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        licensePlate: data.licensePlate,
        manufacturer: data.manufacturer,
        model: data.model,
        year: data.year ? parseInt(data.year) : null,
        color: data.color || null,
        status: data.status,
        contractType: data.contractType || null,
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
        monthlyPayment: data.monthlyPayment ? parseFloat(data.monthlyPayment) : null,
        currentKm: data.currentKm ? parseInt(data.currentKm) : null,
        notes: data.notes || null,
      },
      include: {
        currentDriver: {
          select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true }
        }
      }
    })
    
    await logCrud('UPDATE', 'vehicles', 'vehicle', params.id,
      `${vehicle.manufacturer} ${vehicle.model} (${vehicle.licensePlate})`, {
      licensePlate: vehicle.licensePlate,
      status: vehicle.status,
    })
    
    return NextResponse.json(vehicle)
  } catch (error) {
    console.error('Error updating vehicle:', error)
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
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
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true }
    })
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    await prisma.vehicle.delete({ where: { id: params.id } })
    
    await logCrud('DELETE', 'vehicles', 'vehicle', params.id,
      `${vehicle.manufacturer} ${vehicle.model} (${vehicle.licensePlate})`, {
      licensePlate: vehicle.licensePlate,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
