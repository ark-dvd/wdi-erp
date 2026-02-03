import { prisma } from "@/lib/prisma"
import { auth } from '@/lib/auth'
import { NextResponse } from "next/server"
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
  FILTER_DEFINITIONS,
  SORT_DEFINITIONS,
} from '@/lib/api-contracts'
import { requirePermission, getPermissionFilter } from '@/lib/permissions'

// Version: 20260202-RBAC-V2-PHASE5-C
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// C2: Added scope-based filtering for ASSIGNED users
// MAYBACH: R1-Pagination, R3-FilterStrictness, R4-Sorting, R5-Versioning

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  // C2: RBAC v2 / DOC-016 §6.1: Permission gate for reading events
  const denied = await requirePermission(session, 'events', 'read')
  if (denied) return denied

  // C2: Get user's permission scope to filter results for ASSIGNED scope
  const userId = (session.user as any)?.id
  const permFilter = userId ? await getPermissionFilter(userId, 'events') : null

  try {
    const { searchParams } = new URL(request.url)

    // R1: Parse pagination using Maybach utilities
    const { page, limit } = parsePagination(searchParams)

    // R3: Validate filters (no silent ignore)
    const filterResult = parseAndValidateFilters(searchParams, FILTER_DEFINITIONS.events)
    if (!filterResult.valid) {
      return filterValidationError(filterResult.errors)
    }
    const { project: projectId, type: eventType, search, from: fromDate, to: toDate } = filterResult.filters

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.events)
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error)
    }

    const where: any = {}

    // C2: Get assigned project IDs for ASSIGNED scope users
    let assignedProjectIds: string[] | null = null
    if (permFilter?.scope === 'ASSIGNED' && permFilter.where?.id?.in) {
      assignedProjectIds = permFilter.where.id.in as string[]
    }

    // סינון לפי פרויקט (כולל ילדים)
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          children: {
            select: {
              id: true,
              children: { select: { id: true } }
            }
          }
        }
      })

      if (project) {
        let projectIds = [project.id]
        project.children.forEach(child => {
          projectIds.push(child.id)
          child.children.forEach(grandchild => {
            projectIds.push(grandchild.id)
          })
        })

        // C2: For ASSIGNED scope, intersect with user's assigned projects
        if (assignedProjectIds) {
          projectIds = projectIds.filter(id => assignedProjectIds!.includes(id))
        }

        where.projectId = { in: projectIds }
      }
    } else if (assignedProjectIds) {
      // C2: No project filter specified - apply ASSIGNED scope filter
      where.projectId = { in: assignedProjectIds }
    }

    // סינון לפי סוג
    if (eventType && eventType !== "all") {
      where.eventType = eventType
    }

    // חיפוש בתיאור
    if (search) {
      where.description = { contains: search, mode: "insensitive" }
    }

    // סינון לפי תאריכים
    if (fromDate || toDate) {
      where.eventDate = {}
      if (fromDate) where.eventDate.gte = fromDate
      if (toDate) {
        const endDate = new Date(toDate)
        endDate.setHours(23, 59, 59, 999)
        where.eventDate.lte = endDate
      }
    }

    // R1: ספירה כוללת
    const total = await prisma.projectEvent.count({ where })

    // שליפת אירועים עם pagination
    const events = await prisma.projectEvent.findMany({
      where,
      include: {
        files: true,
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            level: true,
            parent: {
              select: {
                id: true,
                name: true,
                projectNumber: true,
                parent: {
                  select: { id: true, name: true, projectNumber: true }
                }
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
            employee: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      },
      // R4: Client-configurable sorting
      orderBy: toPrismaOrderBy(sortResult.sort),
      // R1: Apply pagination
      skip: calculateSkip(page, limit),
      take: limit,
    })

    const eventsWithUserNames = events.map(event => ({
      ...event,
      createdByName: event.createdBy?.employee
        ? `${event.createdBy.employee.firstName} ${event.createdBy.employee.lastName}`
        : event.createdBy?.name || event.createdBy?.email || null
    }))

    // R1 + R5: Return paginated response with versioning (standard format: items, not events)
    return versionedResponse(paginatedResponse(eventsWithUserNames, page, limit, total))
  } catch (error) {
    console.error("Error fetching events:", error)
    return versionedResponse({ error: "שגיאה בטעינת אירועים" }, { status: 500 })
  }
}
