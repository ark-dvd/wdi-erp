// ================================================
// WDI ERP - Vehicles API Route
// Version: 20260202-RBAC-V2-PHASE5-D
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// D1: OWN scope enforcement - filters by currentDriverId
// MAYBACH: R1-Pagination, R2-FieldValidation, R3-FilterStrictness, R4-Sorting, R5-Versioning
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'
import { VehicleStatus } from '@prisma/client'
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
import { requirePermission, getPermissionFilter } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  try {
    // D1: RBAC v2 / DOC-016 §6.1: Permission gate for reading vehicles
    const denied = await requirePermission(session, 'vehicles', 'read')
    if (denied) return denied

    // D1: Get user's permission scope for OWN filtering
    const userId = (session.user as any)?.id
    const permFilter = userId ? await getPermissionFilter(userId, 'vehicles') : null

    const { searchParams } = new URL(request.url)

    // R1: Parse pagination
    const { page, limit } = parsePagination(searchParams)

    // R3: Validate filters (no silent ignore)
    const filterResult = parseAndValidateFilters(searchParams, FILTER_DEFINITIONS.vehicles)
    if (!filterResult.valid) {
      return filterValidationError(filterResult.errors)
    }
    const { status } = filterResult.filters

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.vehicles)
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error)
    }

    const where: any = {}

    // D1: Apply OWN scope filtering - only vehicles assigned to user
    if (permFilter?.scope === 'OWN') {
      // Get user's employee ID for assignment filtering
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { employee: { select: { id: true } } }
      })
      if (user?.employee?.id) {
        where.currentDriverId = user.employee.id
      } else {
        // User has no employee record - return empty result
        return versionedResponse(paginatedResponse([], page, limit, 0))
      }
    }
    // ALL scope: no additional filtering needed

    if (status && status !== 'all') {
      where.status = status
    }

    // R1: Count total for pagination
    const total = await prisma.vehicle.count({ where })

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
      // R4: Client-configurable sorting
      orderBy: toPrismaOrderBy(sortResult.sort),
      // R1: Apply pagination
      skip: calculateSkip(page, limit),
      take: limit,
    })

    // R1 + R5: Return paginated response with versioning
    return versionedResponse(paginatedResponse(vehicles, page, limit, total))
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return versionedResponse({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  // RBAC v2: Check create permission for vehicles
  const denied = await requirePermission(session, 'vehicles', 'create')
  if (denied) return denied

  const userId = (session.user as any)?.id

  try {
    const data = await request.json()

    // R2: Field-level validation
    const requiredErrors = validateRequired(data, [
      { field: 'licensePlate', label: 'מספר רישוי' },
      { field: 'manufacturer', label: 'יצרן' },
      { field: 'model', label: 'דגם' },
    ])
    if (requiredErrors.length > 0) {
      return validationError(requiredErrors)
    }

    const existing = await prisma.vehicle.findUnique({
      where: { licensePlate: data.licensePlate }
    })
    if (existing) {
      return versionedResponse({ error: 'מספר רישוי כבר קיים במערכת' }, { status: 409 })
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
        status: data.status || VehicleStatus.ACTIVE,
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

    // Logging
    await logCrud('CREATE', 'vehicles', 'vehicle', vehicle.id,
      `${data.manufacturer} ${data.model} (${data.licensePlate})`, {
        licensePlate: data.licensePlate,
        status: data.status || VehicleStatus.ACTIVE,
      })

    // R5: Versioned response with 201 status
    return versionedResponse(vehicle, { status: 201 })
  } catch (error) {
    console.error('Error creating vehicle:', error)
    return versionedResponse({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}
