// ============================================
// src/app/api/vehicles/[id]/route.ts
// GET - רכב בודד עם כל הפרטים
// PUT - עדכון רכב
// DELETE - מחיקת רכב
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// פונקציית עזר - מציאת העובד שהחזיק ברכב בתאריך מסוים
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
            email: true,
            photoUrl: true,
            role: true,
          }
        },
        assignments: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, photoUrl: true }
            }
          },
          orderBy: { startDate: 'desc' }
        },
        services: { orderBy: { serviceDate: 'desc' } },
        accidents: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { date: 'desc' }
        },
        fuelLogs: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { date: 'desc' }
        },
        tollRoads: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { date: 'desc' }
        },
        parkings: {
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
        }
      }
    })
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    // חישוב סטטיסטיקות
    const stats = {
      totalFuelCost: vehicle.fuelLogs.reduce((sum, log) => sum + log.totalCost, 0),
      totalServiceCost: vehicle.services.reduce((sum, s) => sum + (s.cost || 0), 0),
      totalAccidentCost: vehicle.accidents.reduce((sum, a) => sum + (a.cost || 0), 0),
      totalTollCost: vehicle.tollRoads.reduce((sum, t) => sum + t.cost, 0),
      totalParkingCost: vehicle.parkings.reduce((sum, p) => sum + p.cost, 0),
      totalTicketsCost: vehicle.tickets.reduce((sum, t) => sum + (t.paidAmount || t.fineAmount || 0), 0),
      pendingTickets: vehicle.tickets.filter(t => t.status === 'PENDING').length,
      totalFuelLiters: vehicle.fuelLogs.reduce((sum, log) => sum + log.liters, 0),
      avgFuelConsumption: 0,
      totalCost: 0,
    }
    
    // סה"כ עלויות
    stats.totalCost = stats.totalFuelCost + stats.totalServiceCost + stats.totalAccidentCost + 
                      stats.totalTollCost + stats.totalParkingCost + stats.totalTicketsCost
    
    // חישוב צריכת דלק ממוצעת
    if (vehicle.fuelLogs.length >= 2) {
      const sortedLogs = [...vehicle.fuelLogs].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      const firstLog = sortedLogs[0]
      const lastLog = sortedLogs[sortedLogs.length - 1]
      if (firstLog.mileage && lastLog.mileage) {
        const kmDiff = lastLog.mileage - firstLog.mileage
        if (kmDiff > 0) {
          const litersUsed = sortedLogs.slice(1).reduce((sum, log) => sum + log.liters, 0)
          stats.avgFuelConsumption = Math.round((litersUsed / kmDiff) * 100 * 10) / 10
        }
      }
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
  try {
    const data = await request.json()
    
    if (data.licensePlate) {
      const existing = await prisma.vehicle.findFirst({
        where: { licensePlate: data.licensePlate, NOT: { id: params.id } }
      })
      if (existing) {
        return NextResponse.json({ error: 'מספר רישוי כבר קיים במערכת' }, { status: 400 })
      }
    }
    
    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        licensePlate: data.licensePlate,
        manufacturer: data.manufacturer,
        model: data.model,
        year: data.year ? parseInt(data.year) : null,
        color: data.color || null,
        contractType: data.contractType || null,
        leasingCompany: data.leasingCompany || null,
        contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
        monthlyPayment: data.monthlyPayment ? parseFloat(data.monthlyPayment) : null,
        currentKm: data.currentKm ? parseInt(data.currentKm) : null,
        lastServiceDate: data.lastServiceDate ? new Date(data.lastServiceDate) : null,
        lastServiceKm: data.lastServiceKm ? parseInt(data.lastServiceKm) : null,
        nextServiceDate: data.nextServiceDate ? new Date(data.nextServiceDate) : null,
        nextServiceKm: data.nextServiceKm ? parseInt(data.nextServiceKm) : null,
        status: data.status,
        notes: data.notes || null,
      }
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
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { currentDriverId: true }
    })
    
    if (vehicle?.currentDriverId) {
      return NextResponse.json(
        { error: 'לא ניתן למחוק רכב שמשויך לעובד. יש לבטל את השיוך קודם.' },
        { status: 400 }
      )
    }
    
    await prisma.vehicle.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
