// ============================================
// src/app/api/vehicles/[id]/services/route.ts
// Version: 20260111-223000
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
    const services = await prisma.vehicleService.findMany({
      where: { vehicleId: params.id },
      orderBy: { serviceDate: 'desc' }
    })
    return NextResponse.json(services)
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
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
      select: { id: true, licensePlate: true, manufacturer: true, model: true }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    const service = await prisma.vehicleService.create({
      data: {
        vehicleId: params.id,
        serviceDate: new Date(data.serviceDate),
        serviceType: data.serviceType,
        description: data.description || null,
        odometer: data.odometer ? parseInt(data.odometer) : null,
        cost: data.cost ? parseFloat(data.cost) : null,
        garage: data.garage || null,
        invoiceUrl: data.invoiceUrl || null,
        nextServiceDate: data.nextServiceDate ? new Date(data.nextServiceDate) : null,
        nextServiceKm: data.nextServiceKm ? parseInt(data.nextServiceKm) : null,
        notes: data.notes || null,
      }
    })
    
    if (data.odometer) {
      await prisma.vehicle.update({
        where: { id: params.id },
        data: { currentKm: parseInt(data.odometer) }
      })
    }
    
    await logCrud('CREATE', 'vehicles', 'service', service.id,
      `טיפול ${data.serviceType} - ${vehicle.licensePlate}`, {
      vehicleId: params.id,
      serviceType: data.serviceType,
      cost: data.cost,
    })
    
    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
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
    const { serviceId, ...updateData } = data
    
    if (!serviceId) {
      return NextResponse.json({ error: 'Missing serviceId' }, { status: 400 })
    }
    
    const service = await prisma.vehicleService.update({
      where: { id: serviceId },
      data: {
        serviceDate: updateData.serviceDate ? new Date(updateData.serviceDate) : undefined,
        serviceType: updateData.serviceType,
        description: updateData.description,
        odometer: updateData.odometer ? parseInt(updateData.odometer) : undefined,
        cost: updateData.cost ? parseFloat(updateData.cost) : undefined,
        garage: updateData.garage,
        invoiceUrl: updateData.invoiceUrl,
        nextServiceDate: updateData.nextServiceDate ? new Date(updateData.nextServiceDate) : undefined,
        nextServiceKm: updateData.nextServiceKm ? parseInt(updateData.nextServiceKm) : undefined,
        notes: updateData.notes,
      }
    })
    
    const vehicleData = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true }
    })
    
    await logCrud('UPDATE', 'vehicles', 'service', serviceId,
      `טיפול ${vehicleData?.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json(service)
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
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
    const serviceId = searchParams.get('serviceId')
    
    if (!serviceId) {
      return NextResponse.json({ error: 'Missing serviceId' }, { status: 400 })
    }
    
    const service = await prisma.vehicleService.findUnique({
      where: { id: serviceId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    
    await prisma.vehicleService.delete({ where: { id: serviceId } })
    
    await logCrud('DELETE', 'vehicles', 'service', serviceId,
      `טיפול ${service.vehicle.licensePlate}`, {
      vehicleId: params.id,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
