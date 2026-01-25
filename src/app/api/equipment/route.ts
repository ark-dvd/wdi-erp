// ================================================
// WDI ERP - Equipment API Route
// Version: 20260125-RBAC-V1-CENTRAL
// RBAC v1: Central authorization via loadUserAuthContext + evaluateAuthorization
// MAYBACH: R1-Pagination, R2-FieldValidation, R3-FilterStrictness, R4-Sorting, R5-Versioning
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'
import { EquipmentStatus, EquipmentType } from '@prisma/client'
import { equipmentTypeLabels } from '@/lib/equipment-labels'
import {
  parsePagination,
  calculateSkip,
  paginatedResponse,
  parseAndValidateFilters,
  filterValidationError,
  parseAndValidateSort,
  sortValidationError,
  toPrismaOrderBy,
  versionedResponse,
  validationError,
  validateRequired,
  FILTER_DEFINITIONS,
  SORT_DEFINITIONS,
} from '@/lib/api-contracts'
import { loadUserAuthContext, evaluateAuthorization } from '@/lib/authorization'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any)?.id
  if (!userId) {
    return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // RBAC v1: Central authorization
    const ctx = await loadUserAuthContext(userId)
    if (!ctx) {
      return versionedResponse({ error: 'אין הרשאה' }, { status: 403 })
    }

    const authResult = await evaluateAuthorization(ctx, {
      module: 'equipment',
      operation: 'READ',
    })

    if (!authResult.authorized) {
      return versionedResponse({ error: 'אין הרשאה לצפות בציוד' }, { status: 403 })
    }

    // RBAC v1: This module is ALL-scope only
    if (authResult.effectiveScope !== 'ALL') {
      return versionedResponse({ error: 'אין הרשאה לצפות בציוד (נדרש ALL)' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    // R1: Parse pagination
    const { page, limit } = parsePagination(searchParams)

    // R3: Validate filters (no silent ignore)
    const filterResult = parseAndValidateFilters(searchParams, FILTER_DEFINITIONS.equipment)
    if (!filterResult.valid) {
      return filterValidationError(filterResult.errors)
    }
    const { status, type, assigneeId, isOffice } = filterResult.filters

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.equipment)
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error)
    }

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

    // RBAC v1: This module is ALL-scope only (enforced above)

    // R1: Count total for pagination
    const total = await prisma.equipment.count({ where })

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
      // R4: Client-configurable sorting
      orderBy: toPrismaOrderBy(sortResult.sort),
      // R1: Apply pagination
      skip: calculateSkip(page, limit),
      take: limit,
    })

    // R1 + R5: Return paginated response with versioning
    return versionedResponse(paginatedResponse(equipment, page, limit, total))
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return versionedResponse({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any)?.id
  if (!userId) {
    return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
  }

  // RBAC v1: Central authorization
  const ctx = await loadUserAuthContext(userId)
  if (!ctx) {
    return versionedResponse({ error: 'אין הרשאה' }, { status: 403 })
  }

  const authResult = await evaluateAuthorization(ctx, {
    module: 'equipment',
    operation: 'CREATE',
  })

  if (!authResult.authorized) {
    return versionedResponse({ error: 'אין הרשאה להוסיף ציוד' }, { status: 403 })
  }

  // RBAC v1: This module is ALL-scope only
  if (authResult.effectiveScope !== 'ALL') {
    return versionedResponse({ error: 'אין הרשאה להוסיף ציוד (נדרש ALL)' }, { status: 403 })
  }

  try {
    const data = await request.json()

    // R2: Field-level validation
    const requiredErrors = validateRequired(data, [
      { field: 'type', label: 'סוג ציוד' },
      { field: 'manufacturer', label: 'יצרן' },
      { field: 'model', label: 'דגם' },
    ])
    if (requiredErrors.length > 0) {
      return validationError(requiredErrors)
    }

    // Check for duplicate serial number
    if (data.serialNumber) {
      const existing = await prisma.equipment.findUnique({
        where: { serialNumber: data.serialNumber }
      })
      if (existing) {
        return versionedResponse({ error: 'מספר סריאלי כבר קיים במערכת' }, { status: 409 })
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

    // R5: Versioned response with 201 status
    return versionedResponse(equipment, { status: 201 })
  } catch (error) {
    console.error('Error creating equipment:', error)
    return versionedResponse({ error: 'Failed to create equipment' }, { status: 500 })
  }
}
