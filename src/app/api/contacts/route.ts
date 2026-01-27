// Version: 20260124-MAYBACH
// FIXED: Wrap POST in transaction for atomicity
// SECURITY: Added role-based authorization for POST
// Added: logCrud for CREATE
// MAYBACH: R1-Pagination, R2-FieldValidation, R3-FilterStrictness, R4-Sorting, R5-Versioning
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
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

// Roles that can create/modify contact data (RBAC v2 canonical names per DOC-013 §4.1)
const CONTACTS_WRITE_ROLES = [
  'owner', 'executive', 'trust_officer', 'pmo', 'finance_officer',
  'domain_head', 'project_manager', 'project_coordinator', 'administration'
]

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // R1: Parse pagination
    const { page, limit } = parsePagination(searchParams)

    // R3: Validate filters (no silent ignore)
    const filterResult = parseAndValidateFilters(searchParams, FILTER_DEFINITIONS.contacts)
    if (!filterResult.valid) {
      return filterValidationError(filterResult.errors)
    }
    const { search, type, discipline, organizationId, status } = filterResult.filters

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.contacts)
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error)
    }

    const where: any = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (type) where.contactTypes = { has: type }
    if (discipline) where.disciplines = { has: discipline }
    if (organizationId) where.organizationId = organizationId
    if (status) where.status = status

    // R1: Count total for pagination
    const total = await prisma.contact.count({ where })

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, type: true } },
        projects: {
          where: { status: 'פעיל' },
          include: {
            project: { select: { id: true, name: true, projectNumber: true } }
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            employee: { select: { firstName: true, lastName: true } }
          }
        },
        _count: { select: { projects: true } }
      },
      // R4: Client-configurable sorting
      orderBy: toPrismaOrderBy(sortResult.sort),
      // R1: Apply pagination
      skip: calculateSkip(page, limit),
      take: limit,
    })

    // R1 + R5: Return paginated response with versioning
    return versionedResponse(paginatedResponse(contacts, page, limit, total))
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return versionedResponse({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role

    // Only authorized roles can create contacts
    if (!CONTACTS_WRITE_ROLES.includes(userRole)) {
      return versionedResponse({ error: 'אין הרשאה ליצור אנשי קשר' }, { status: 403 })
    }

    const userId = (session.user as any)?.id || null
    const data = await request.json()

    // R2: Field-level validation
    const requiredErrors = validateRequired(data, [
      { field: 'firstName', label: 'שם פרטי' },
      { field: 'lastName', label: 'שם משפחה' },
      { field: 'phone', label: 'טלפון' },
    ])
    if (requiredErrors.length > 0) {
      return validationError(requiredErrors)
    }

    const contact = await prisma.$transaction(async (tx) => {
      let organizationId = data.organizationId

      if (!organizationId) {
        const fullName = `${data.firstName} ${data.lastName}`
        const org = await tx.organization.create({
          data: {
            name: fullName,
            type: 'עצמאי',
            phone: data.phone || null,
            email: data.email || null,
            updatedById: userId,
          }
        })
        organizationId = org.id
      }

      const contact = await tx.contact.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          nickname: data.nickname || null,
          phone: data.phone,
          phoneAlt: data.phoneAlt || null,
          email: data.email || null,
          emailAlt: data.emailAlt || null,
          linkedinUrl: data.linkedinUrl || null,
          photoUrl: data.photoUrl || null,
          organizationId,
          role: data.role || null,
          department: data.department || null,
          contactTypes: data.contactTypes || [],
          disciplines: data.disciplines || [],
          otherText: data.otherText || null,
          status: data.status || 'פעיל',
          notes: data.notes || null,
          vendorId: data.vendorId || null,
          updatedById: userId,
        },
        include: {
          organization: { select: { id: true, name: true, type: true } },
        }
      })

      return contact
    })

    await logCrud('CREATE', 'contacts', 'contact', contact.id, `${data.firstName} ${data.lastName}`, {
      organizationName: contact.organization?.name,
    })

    // R5: Versioned response with 201 status
    return versionedResponse(contact, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return versionedResponse({ error: 'Failed to create contact' }, { status: 500 })
  }
}
