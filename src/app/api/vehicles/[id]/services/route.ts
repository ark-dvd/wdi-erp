// ============================================
// src/app/api/vehicles/[id]/services/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } })
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    const mileage = data.mileage ? parseInt(data.mileage) : null
    
    const service = await prisma.vehicleService.create({
      data: {
        vehicleId: params.id,
        serviceDate: new Date(data.serviceDate),
        serviceType: data.serviceType,
        mileage,
        cost: data.cost ? parseFloat(data.cost) : null,
        garage: data.garage || null,
        description: data.description || null,
        invoiceUrl: data.invoiceUrl || null,
      }
    })
    
    const updateData: any = { lastServiceDate: new Date(data.serviceDate) }
    if (mileage) {
      updateData.lastServiceKm = mileage
      if (!vehicle.currentKm || mileage > vehicle.currentKm) {
        updateData.currentKm = mileage
      }
    }
    
    await prisma.vehicle.update({ where: { id: params.id }, data: updateData })
    
    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
