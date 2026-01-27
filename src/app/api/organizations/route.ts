// Version: 20260127
// RBAC v2: Use permission system from DOC-013/DOC-014
// MAYBACH: R1-Pagination, R2-FieldValidation, R3-FilterStrictness, R4-Sorting, R5-Versioning
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { requirePermission } from '@/lib/permissions'
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

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) return versionedResponse({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)

    // Check for dropdown mode - returns all items without pagination (for select dropdowns)
    const isDropdown = searchParams.get('dropdown') === 'true'

    // R3: Validate filters (no silent ignore)
    const filterResult = parseAndValidateFilters(searchParams, FILTER_DEFINITIONS.organizations)
    if (!filterResult.valid) {
      return filterValidationError(filterResult.errors)
    }
    const { search, type } = filterResult.filters

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (type) where.type = type

    // Dropdown mode: return all items sorted by name, minimal data
    if (isDropdown) {
      const organizations = await prisma.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          contactTypes: true,
          disciplines: true,
        },
        orderBy: { name: 'asc' },
      })
      return versionedResponse(organizations)
    }

    // R1: Parse pagination (only for non-dropdown mode)
    const { page, limit } = parsePagination(searchParams)

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.organizations)
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error)
    }

    // R1: Count total for pagination
    const total = await prisma.organization.count({ where })

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        _count: { select: { contacts: true } },
        updatedBy: { select: { name: true, employee: { select: { firstName: true, lastName: true } } } }
      },
      // R4: Client-configurable sorting
      orderBy: toPrismaOrderBy(sortResult.sort),
      // R1: Apply pagination
      skip: calculateSkip(page, limit),
      take: limit,
    })

    // R1 + R5: Return paginated response with versioning
    return versionedResponse(paginatedResponse(organizations, page, limit, total))
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return versionedResponse({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    // RBAC v2: Check create permission
    const denied = await requirePermission(session, 'organizations', 'create')
    if (denied) return denied

    const userId = (session!.user as any)?.id || null
    const data = await request.json()

    // R2: Field-level validation
    const requiredErrors = validateRequired(data, [
      { field: 'name', label: 'שם ארגון' },
    ])
    if (requiredErrors.length > 0) {
      return validationError(requiredErrors)
    }

    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        type: data.type || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        address: data.address || null,
        businessId: data.businessId || null,
        logoUrl: data.logoUrl || null,
        notes: data.notes || null,
        isVendor: data.isVendor || false,
        contactTypes: data.contactTypes || [],
        disciplines: data.disciplines || [],
        otherText: data.otherText || null,
        updatedById: userId,
      }
    })

    // Logging - added
    await logCrud('CREATE', 'organizations', 'organization', organization.id, data.name, {
      type: data.type,
      isVendor: data.isVendor,
    })

    // R5: Versioned response with 201 status
    return versionedResponse(organization, { status: 201 })
  } catch (error) {
    console.error('Error creating organization:', error)
    return versionedResponse({ error: 'Failed to create organization' }, { status: 500 })
  }
}
