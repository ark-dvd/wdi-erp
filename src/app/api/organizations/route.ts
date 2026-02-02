// Version: 20260202-PHASE0
// RBAC v2: Use permission system from DOC-013/DOC-014
// MAYBACH: R1-Pagination, R2-FieldValidation, R3-FilterStrictness, R4-Sorting, R5-Versioning
// Phase 0 Remediation: INV-004, CC-001, CC-002
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud, logActivity } from '@/lib/activity'
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
  const session = await auth()
  const userId = (session?.user as any)?.id || null
  const userRole = (session?.user as any)?.role || null

  try {
    // INV-004: Authorization check required for all data-accessing routes
    if (!session) return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })

    // INV-004, CC-002: Check READ permission for contacts module (organizations are part of contacts per DOC-013 §6.1)
    const denied = await requirePermission(session, 'contacts', 'read')
    if (denied) {
      // DOC-016 §7.1: Log authorization denial
      await logActivity({
        action: 'READ',
        category: 'SECURITY',
        module: 'organizations',
        userId,
        userRole,
        details: {
          decision: 'DENY',
          reason: 'PERMISSION_DENIED',
          operation: 'READ',
        },
      })
      return denied
    }

    // DOC-016 §7.1: Log authorization grant (only once per request, not per record)
    await logActivity({
      action: 'READ',
      category: 'SECURITY',
      module: 'organizations',
      userId,
      userRole,
      details: {
        decision: 'GRANT',
        operation: 'READ',
      },
    })

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

    // RBAC v2: Check create permission (organizations use 'contacts' module per DOC-013 §6.1)
    const denied = await requirePermission(session, 'contacts', 'create')
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
