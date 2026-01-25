// ================================================
// WDI ERP - Vehicles API Route
// Version: 20260125-RBAC-V1-CENTRAL
// RBAC v1: Central authorization via loadUserAuthContext + evaluateAuthorization
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
      module: 'vehicles',
      operation: 'READ',
    })

    if (!authResult.authorized) {
      return versionedResponse({ error: 'אין הרשאה לצפות ברכבים' }, { status: 403 })
    }

    // RBAC v1: This module is ALL-scope only
    if (authResult.effectiveScope !== 'ALL') {
      return versionedResponse({ error: 'אין הרשאה לצפות ברכבים (נדרש ALL)' }, { status: 403 })
    }

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
    if (status && status !== 'all') {
      where.status = status
    }

    // RBAC v1: This module is ALL-scope only (enforced above)

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
    module: 'vehicles',
    operation: 'CREATE',
  })

  if (!authResult.authorized) {
    return versionedResponse({ error: 'אין הרשאה ליצור רכבים' }, { status: 403 })
  }

  // RBAC v1: This module is ALL-scope only
  if (authResult.effectiveScope !== 'ALL') {
    return versionedResponse({ error: 'אין הרשאה ליצור רכבים (נדרש ALL)' }, { status: 403 })
  }

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
