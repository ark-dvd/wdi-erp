// ============================================
// src/app/api/vehicles/route.ts
// Version: 20260111-141000
// Added: logCrud for CREATE
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }
    
    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        currentDriver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            photoUrl: true,
          }
        },
        _count: {
          select: {
            accidents: true,
            services: true,
            fuelLogs: true,
            assignments: true,
            tollRoads: true,
            parkings: true,
            tickets: true,
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    return NextResponse.json(vehicles)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const existing = await prisma.vehicle.findUnique({
      where: { licensePlate: data.licensePlate }
    })
    if (existing) {
      return NextResponse.json({ error: 'מספר רישוי כבר קיים במערכת' }, { status: 400 })
    }
    
    const vehicle = await prisma.vehicle.create({
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
        nextServiceDate: data.nextServiceDate ? new Date(data.nextServiceDate) : null,
        nextServiceKm: data.nextServiceKm ? parseInt(data.nextServiceKm) : null,
        status: data.status || 'ACTIVE',
        notes: data.notes || null,
      }
    })
    
    if (data.currentDriverId) {
      await prisma.$transaction([
        prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { currentDriverId: data.currentDriverId }
        }),
        prisma.vehicleAssignment.create({
          data: {
            vehicleId: vehicle.id,
            employeeId: data.currentDriverId,
            startDate: new Date(),
            startKm: data.currentKm ? parseInt(data.currentKm) : null,
          }
        })
      ])
    }
    
    // Logging - added
    await logCrud('CREATE', 'vehicles', 'vehicle', vehicle.id, 
      `${data.manufacturer} ${data.model} (${data.licensePlate})`, {
      licensePlate: data.licensePlate,
      status: data.status || 'ACTIVE',
    })
    
    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    console.error('Error creating vehicle:', error)
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}
