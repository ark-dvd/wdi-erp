// ================================================
// WDI ERP - HR API Route
// Version: 20260202-RBAC-V2-PHASE5-FIX
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// RBAC v2 Scope Enforcement: SELF/MAIN_PAGE/ALL per DOC-016 §5.2
// A-FIX-1: Field-level restriction based on scope
// MAYBACH: R1-Pagination, R2-FieldValidation, R3-FilterStrictness, R4-Sorting, R5-Versioning
// ================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { requirePermission, getPermissionFilter, type Scope } from '@/lib/permissions'
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

// ================================================
// A-FIX-1: Field selections based on scope (DOC-016 §5.2)
// ================================================

// MAIN_PAGE scope: List-safe fields only (no PII, no documents, no deep relations)
const MAIN_PAGE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  department: true,
  phone: true,
  email: true,
  status: true,
  photoUrl: true,
  // No birthDate (PII), no startDate, no updatedAt, no relations
} as const

// SELF/ALL scope: Full details including relations
const FULL_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  // idNumber: removed from response for security (PII) - even for SELF/ALL
  role: true,
  department: true,
  phone: true,
  email: true,
  status: true,
  photoUrl: true,
  birthDate: true,
  startDate: true,
  updatedAt: true,
  managedProjects: {
    select: {
      project: {
        select: {
          id: true,
          name: true,
          projectNumber: true,
          state: true,
        }
      }
    },
    where: {
      project: {
        state: 'פעיל'
      }
    }
  },
  ledProjects: {
    select: {
      id: true,
      name: true,
      projectNumber: true,
      state: true,
    },
    where: {
      state: 'פעיל'
    }
  },
} as const

/**
 * Get appropriate Prisma select based on effective scope
 * MAIN_PAGE: restricted fields for list view
 * SELF/ALL: full fields including relations
 */
function getSelectForScope(scope: Scope): typeof MAIN_PAGE_SELECT | typeof FULL_SELECT {
  if (scope === 'MAIN_PAGE') {
    return MAIN_PAGE_SELECT
  }
  // SELF, ALL, and other scopes get full details
  return FULL_SELECT
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v2 / DOC-016 §6.1: Permission check with scope
    const denied = await requirePermission(session, 'hr', 'read')
    if (denied) return denied

    // RBAC v2 / DOC-016 §5.2: Get scope-based filter for HR module
    const userId = (session.user as any).id
    const permFilter = await getPermissionFilter(userId, 'hr')
    if (!permFilter) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    // R1: Parse pagination
    const { page, limit } = parsePagination(searchParams)

    // R3: Validate filters (no silent ignore)
    const filterResult = parseAndValidateFilters(searchParams, FILTER_DEFINITIONS.employees)
    if (!filterResult.valid) {
      return filterValidationError(filterResult.errors)
    }
    const { search, status, department, role } = filterResult.filters

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.employees)
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error)
    }

    // Start with scope-based filter (SELF/MAIN_PAGE/ALL)
    const where: any = { ...permFilter.where }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }
    if (status) where.status = status
    if (department) where.department = department
    if (role) where.role = role

    // R1: Count total for pagination
    const total = await prisma.employee.count({ where })

    // A-FIX-1: Select fields based on effective scope
    const selectFields = getSelectForScope(permFilter.scope)

    const employees = await prisma.employee.findMany({
      where,
      // R4: Client-configurable sorting
      orderBy: toPrismaOrderBy(sortResult.sort),
      // R1: Apply pagination
      skip: calculateSkip(page, limit),
      take: limit,
      select: selectFields,
    })

    // R1 + R5: Return paginated response with versioning
    return versionedResponse(paginatedResponse(employees, page, limit, total))
  } catch (error) {
    console.error('Error fetching employees:', error)
    return versionedResponse({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    // RBAC v2: Check create permission
    const denied = await requirePermission(session, 'hr', 'create')
    if (denied) return denied

    const data = await request.json()

    // R2: Field-level validation
    const requiredErrors = validateRequired(data, [
      { field: 'firstName', label: 'שם פרטי' },
      { field: 'lastName', label: 'שם משפחה' },
      { field: 'idNumber', label: 'תעודת זהות' },
      { field: 'role', label: 'תפקיד' },
    ])
    if (requiredErrors.length > 0) {
      return validationError(requiredErrors)
    }

    const normalizedEmail = data.email?.toLowerCase() || null

    const existingEmployee = await prisma.employee.findUnique({
      where: { idNumber: data.idNumber },
    })

    if (existingEmployee) {
      return versionedResponse({ error: 'עובד עם תעודת זהות זו כבר קיים במערכת' }, { status: 409 })
    }

    // Stage 2: User must exist before Employee creation
    if (normalizedEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })
      if (!existingUser) {
        return validationError({ email: 'משתמש לא קיים במערכת. יש ליצור משתמש לפני יצירת עובד' })
      }
    }

    const employee = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          idNumber: data.idNumber,
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          phone: data.phone || null,
          email: normalizedEmail,
          personalEmail: data.personalEmail || null, // #8: אימייל אישי
          address: data.address || null,
          linkedinUrl: data.linkedinUrl || null,
          spouseFirstName: data.spouseFirstName || null,
          spouseLastName: data.spouseLastName || null,
          spouseIdNumber: data.spouseIdNumber || null,
          spouseBirthDate: data.spouseBirthDate ? new Date(data.spouseBirthDate) : null,
          spousePhone: data.spousePhone || null,
          spouseEmail: data.spouseEmail || null,
          marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
          children: data.children ? JSON.stringify(data.children) : null,
          education: data.education ? JSON.stringify(data.education) : null,
          certifications: data.certifications ? JSON.stringify(data.certifications) : null, // #10: הכשרות
          role: data.role,
          department: data.department || null,
          employmentType: data.employmentType || 'אורגני',
          employeeCategory: data.employeeCategory || null,
          employmentPercent: data.employmentPercent || null,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          grossSalary: data.grossSalary || null,
          status: data.status || 'פעיל',
          securityClearance: data.securityClearance || null,
          photoUrl: data.photoUrl || null,
          idCardFileUrl: data.idCardFileUrl || null,
          idCardSpouseFileUrl: data.idCardSpouseFileUrl || null,
          driversLicenseFileUrl: data.driversLicenseFileUrl || null,
          contractFileUrl: data.contractFileUrl || null,
          // Note: Employee model doesn't have updatedById in schema
        },
      })

      // Link to existing User (Stage 2: pre-existence verified above)
      if (normalizedEmail) {
        await tx.user.update({
          where: { email: normalizedEmail },
          data: { employeeId: employee.id },
        })
      }

      return employee
    })

    // תיעוד הפעולה
    await logCrud('CREATE', 'hr', 'employee', employee.id, `${data.firstName} ${data.lastName}`, {
      role: data.role,
      department: data.department
    })

    // R5: Versioned response with 201 status
    return versionedResponse(employee, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return versionedResponse({ error: 'Failed to create employee' }, { status: 500 })
  }
}
