// ============================================
// src/app/api/equipment/[id]/route.ts
// Version: 20260127
// RBAC v2: Use permission system from DOC-013/DOC-014
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'
import { EquipmentStatus, EquipmentType } from '@prisma/client'
import { equipmentTypeLabels, equipmentStatusLabels } from '@/lib/equipment-labels'
import { requirePermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    // RBAC v2: Check read permission
    const denied = await requirePermission(session, 'equipment', 'read', { id: params.id })
    if (denied) return denied

    const equipment = await prisma.equipment.findUnique({
      where: { id: params.id },
      include: {
        currentAssignee: {
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
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                photoUrl: true 
              }
            }
          },
          orderBy: { startDate: 'desc' }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            employee: { select: { firstName: true, lastName: true } }
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            employee: { select: { firstName: true, lastName: true } }
          }
        },
      }
    })
    
    if (!equipment) {
      return NextResponse.json({ error: 'ציוד לא נמצא' }, { status: 404 })
    }

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    // RBAC v2: Check update permission
    const denied = await requirePermission(session, 'equipment', 'update', { id: params.id })
    if (denied) return denied

    const userId = (session!.user as any)?.id || null
    const data = await request.json()
    
    const existing = await prisma.equipment.findUnique({
      where: { id: params.id },
      include: { currentAssignee: true }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'ציוד לא נמצא' }, { status: 404 })
    }
    
    // Check for duplicate serial number (if changed)
    if (data.serialNumber && data.serialNumber !== existing.serialNumber) {
      const duplicate = await prisma.equipment.findUnique({
        where: { serialNumber: data.serialNumber }
      })
      if (duplicate) {
        return NextResponse.json({ error: 'מספר סריאלי כבר קיים במערכת' }, { status: 409 })
      }
    }
    
    const isScreenType = ['LAPTOP', 'MONITOR', 'MEETING_ROOM_TV'].includes(data.type)
    
    // Handle assignee change
    const newAssigneeId = data.isOfficeEquipment ? null : (data.currentAssigneeId || null)
    const assigneeChanged = newAssigneeId !== existing.currentAssigneeId
    
    // If assignee changed, close old assignment and create new one
    if (assigneeChanged) {
      const operations: any[] = []
      
      // Close current assignment if exists
      if (existing.currentAssigneeId) {
        const currentAssignment = await prisma.equipmentAssignment.findFirst({
          where: {
            equipmentId: params.id,
            employeeId: existing.currentAssigneeId,
            endDate: null
          }
        })
        if (currentAssignment) {
          operations.push(
            prisma.equipmentAssignment.update({
              where: { id: currentAssignment.id },
              data: { endDate: new Date() }
            })
          )
        }
      }
      
      // Create new assignment if has new assignee
      if (newAssigneeId) {
        operations.push(
          prisma.equipmentAssignment.create({
            data: {
              equipmentId: params.id,
              employeeId: newAssigneeId,
              startDate: new Date(),
              notes: data.assignmentNotes || null,
            }
          })
        )
      }
      
      if (operations.length > 0) {
        await prisma.$transaction(operations)
      }
    }
    
    const equipment = await prisma.equipment.update({
      where: { id: params.id },
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
        status: data.status || existing.status,
        isOfficeEquipment: data.isOfficeEquipment === true || data.isOfficeEquipment === 'true',
        currentAssigneeId: newAssigneeId,
        screenSizeInch: isScreenType && data.screenSizeInch ? parseFloat(data.screenSizeInch) : null,
        // Laptop-specific fields
        processor: data.type === 'LAPTOP' ? data.processor || null : null,
        ramGB: data.type === 'LAPTOP' && data.ramGB ? parseInt(data.ramGB) : null,
        storageGB: data.type === 'LAPTOP' && data.storageGB ? parseInt(data.storageGB) : null,
        hasTouchscreen: data.type === 'LAPTOP' ? data.hasTouchscreen === true || data.hasTouchscreen === 'true' : null,
        operatingSystem: data.type === 'LAPTOP' ? data.operatingSystem || null : null,
        notes: data.notes || null,
        updatedById: userId,
      },
      include: {
        currentAssignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })
    
    // Log the action
    const typeLabel = equipmentTypeLabels[data.type as EquipmentType] || data.type
    await logCrud('UPDATE', 'equipment', 'equipment', equipment.id, 
      `${typeLabel} - ${data.manufacturer} ${data.model}`, {
      type: data.type,
      serialNumber: data.serialNumber,
      status: data.status,
      assigneeChanged,
    })
    
    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error updating equipment:', error)
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    // RBAC v2: Check delete permission
    const denied = await requirePermission(session, 'equipment', 'delete', { id: params.id })
    if (denied) return denied
    const equipment = await prisma.equipment.findUnique({
      where: { id: params.id }
    })
    
    if (!equipment) {
      return NextResponse.json({ error: 'ציוד לא נמצא' }, { status: 404 })
    }

    // Delete equipment (assignments will cascade)
    await prisma.equipment.delete({
      where: { id: params.id }
    })
    
    // Log the action
    const typeLabel = equipmentTypeLabels[equipment.type] || equipment.type
    await logCrud('DELETE', 'equipment', 'equipment', params.id, 
      `${typeLabel} - ${equipment.manufacturer} ${equipment.model}`, {
      type: equipment.type,
      serialNumber: equipment.serialNumber,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 })
  }
}
