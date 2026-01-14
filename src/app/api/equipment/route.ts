// ============================================
// src/app/api/equipment/route.ts
// Version: 20260114-224500
// Equipment module - main API
// FIXED: Moved labels to separate file (Next.js route export restriction)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'
import { EquipmentStatus, EquipmentType } from '@prisma/client'
import { equipmentTypeLabels } from '@/lib/equipment-labels'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const assigneeId = searchParams.get('assigneeId')
    const isOffice = searchParams.get('isOffice')
    
    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status
    }
    if (type && type !== 'all') {
      where.type = type
    }
    if (assigneeId) {
      where.currentAssigneeId = assigneeId
    }
    if (isOffice === 'true') {
      where.isOfficeEquipment = true
    } else if (isOffice === 'false') {
      where.isOfficeEquipment = false
    }
    
    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        currentAssignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            photoUrl: true,
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            employee: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        _count: {
          select: {
            assignments: true,
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = (session.user as any)?.id || null
    const data = await request.json()
    
    // Check for duplicate serial number
    if (data.serialNumber) {
      const existing = await prisma.equipment.findUnique({
        where: { serialNumber: data.serialNumber }
      })
      if (existing) {
        return NextResponse.json({ error: 'מספר סריאלי כבר קיים במערכת' }, { status: 400 })
      }
    }
    
    // Determine if it's a screen type (needs screenSizeInch)
    const isScreenType = ['LAPTOP', 'MONITOR', 'MEETING_ROOM_TV'].includes(data.type)
    
    const equipment = await prisma.equipment.create({
      data: {
        type: data.type,
        typeOther: data.type === 'OTHER' ? data.typeOther : null,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber || null,
        yearOfManufacture: data.yearOfManufacture ? parseInt(data.yearOfManufacture) : null,
        supplier: data.supplier || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        invoiceUrl: data.invoiceUrl || null,
        location: data.location || null,
        status: data.status || EquipmentStatus.ACTIVE,
        isOfficeEquipment: data.isOfficeEquipment === true || data.isOfficeEquipment === 'true',
        screenSizeInch: isScreenType && data.screenSizeInch ? parseFloat(data.screenSizeInch) : null,
        // Laptop-specific fields
        processor: data.type === 'LAPTOP' ? data.processor || null : null,
        ramGB: data.type === 'LAPTOP' && data.ramGB ? parseInt(data.ramGB) : null,
        storageGB: data.type === 'LAPTOP' && data.storageGB ? parseInt(data.storageGB) : null,
        hasTouchscreen: data.type === 'LAPTOP' ? data.hasTouchscreen === true || data.hasTouchscreen === 'true' : null,
        operatingSystem: data.type === 'LAPTOP' ? data.operatingSystem || null : null,
        notes: data.notes || null,
        createdById: userId,
        updatedById: userId,
      }
    })
    
    // If assigned to employee, create assignment record
    if (data.currentAssigneeId && !data.isOfficeEquipment) {
      await prisma.$transaction([
        prisma.equipment.update({
          where: { id: equipment.id },
          data: { currentAssigneeId: data.currentAssigneeId }
        }),
        prisma.equipmentAssignment.create({
          data: {
            equipmentId: equipment.id,
            employeeId: data.currentAssigneeId,
            startDate: new Date(),
            notes: 'שיוך ראשוני',
          }
        })
      ])
    }
    
    // Log the action
    const typeLabel = equipmentTypeLabels[data.type as EquipmentType] || data.type
    await logCrud('CREATE', 'equipment', 'equipment', equipment.id, 
      `${typeLabel} - ${data.manufacturer} ${data.model}`, {
      type: data.type,
      serialNumber: data.serialNumber,
      status: data.status || EquipmentStatus.ACTIVE,
    })
    
    return NextResponse.json(equipment, { status: 201 })
  } catch (error) {
    console.error('Error creating equipment:', error)
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
  }
}
