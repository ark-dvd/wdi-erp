import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import {
  parsePagination,
  calculateSkip,
  paginatedResponse,
  parseAndValidateSort,
  sortValidationError,
  toPrismaOrderBy,
  versionedResponse,
  SORT_DEFINITIONS,
} from '@/lib/api-contracts'

// Version: 20260124-MAYBACH
// MAYBACH: R1-Pagination, R4-Sorting, R5-Versioning

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return versionedResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'founder') {
      return versionedResponse({ error: 'אין הרשאה לניהול משתמשים' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    // R1: Parse pagination
    const { page, limit } = parsePagination(searchParams)

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.users)
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error)
    }

    // R1: Count total for pagination
    const total = await prisma.user.count()

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        lastLogin: true,
        role: {
          select: {
            name: true,
            displayName: true,
          }
        },
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
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
    return versionedResponse(paginatedResponse(users, page, limit, total))
  } catch (error) {
    console.error('Error fetching users:', error)
    return versionedResponse({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
