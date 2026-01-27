// ================================================
// WDI ERP - Projects API Route
// Version: 20260127
// RBAC v2: Use permission system from DOC-013/DOC-014
// MAYBACH: R1-Pagination, R2-FieldValidation, R3-FilterStrictness, R4-Sorting, R5-Versioning
// ================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { requirePermission, getPermissionFilter } from '@/lib/permissions'
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

async function generateProjectNumber(): Promise<string> {
  let attempts = 0
  while (attempts < 100) {
    const num = Math.floor(1000 + Math.random() * 9000).toString()
    const exists = await prisma.project.findFirst({
      where: { projectNumber: { startsWith: num } }
    })
    if (!exists) return num
    attempts++
  }
  throw new Error('לא ניתן ליצור מספר פרויקט ייחודי')
}

async function generateQuarterNumber(parentNumber: string): Promise<string> {
  const siblings = await prisma.project.findMany({
    where: {
      projectNumber: { startsWith: `${parentNumber}-` },
      level: 'quarter'
    },
    select: { projectNumber: true }
  })

  const usedLetters = siblings.map(s => {
    const match = s.projectNumber.match(new RegExp(`^${parentNumber}-([A-Z])$`))
    return match ? match[1] : null
  }).filter(Boolean)

  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i)
    if (!usedLetters.includes(letter)) {
      return `${parentNumber}-${letter}`
    }
  }
  throw new Error('לא ניתן ליצור מספר אזור')
}

async function generateBuildingNumber(parentNumber: string): Promise<string> {
  const siblings = await prisma.project.findMany({
    where: {
      projectNumber: { startsWith: `${parentNumber}-` },
      level: 'building'
    },
    select: { projectNumber: true }
  })

  const usedNumbers = siblings.map(s => {
    const match = s.projectNumber.match(new RegExp(`^${parentNumber}-(\\d{2})$`))
    return match ? parseInt(match[1]) : 0
  }).filter(n => n > 0)

  const nextNum = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1
  return `${parentNumber}-${String(nextNum).padStart(2, '0')}`
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

async function addManagersToProject(projectId: string, managerIds: string[], tx: TxClient) {
  if (!managerIds || managerIds.length === 0) return

  await tx.projectManager.createMany({
    data: managerIds.map(employeeId => ({
      projectId,
      employeeId,
    })),
  })
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    // RBAC v2: Check read permission
    const denied = await requirePermission(session, 'projects', 'read')
    if (denied) return denied

    const userId = (session!.user as any)?.id

    const { searchParams } = new URL(request.url)

    // R1: Parse pagination
    const { page, limit } = parsePagination(searchParams)

    // R3: Validate filters (no silent ignore)
    const filterResult = parseAndValidateFilters(searchParams, FILTER_DEFINITIONS.projects)
    if (!filterResult.valid) {
      return filterValidationError(filterResult.errors)
    }
    const { search, state, category, level } = filterResult.filters

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.projects)
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error)
    }

    // Build where clause with scope filtering
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { projectNumber: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (state) where.state = state
    if (category) where.category = category
    if (level === 'main') where.parentId = null

    // RBAC v2: Apply scope-based filtering (DOC-013 §5)
    const permFilter = await getPermissionFilter(userId, 'projects')
    if (permFilter && permFilter.scope !== 'ALL') {
      Object.assign(where, permFilter.where)
    }

    // R1: Count total for pagination
    const total = await prisma.project.count({ where })

    const projects = await prisma.project.findMany({
      where,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: {
          select: {
            id: true,
            name: true,
            employee: { select: { firstName: true, lastName: true } }
          }
        },
        managers: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        parent: { select: { id: true, name: true, projectNumber: true } },
        children: {
          include: {
            lead: { select: { id: true, firstName: true, lastName: true } },
            updatedBy: {
              select: {
                id: true,
                name: true,
                employee: { select: { firstName: true, lastName: true } }
              }
            },
            managers: {
              include: {
                employee: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            children: {
              include: {
                lead: { select: { id: true, firstName: true, lastName: true } },
                updatedBy: {
                  select: {
                    id: true,
                    name: true,
                    employee: { select: { firstName: true, lastName: true } }
                  }
                },
                managers: {
                  include: {
                    employee: { select: { id: true, firstName: true, lastName: true } },
                  },
                },
              }
            }
          }
        },
        _count: { select: { events: true } },
      },
      // R4: Client-configurable sorting
      orderBy: toPrismaOrderBy(sortResult.sort),
      // R1: Apply pagination
      skip: calculateSkip(page, limit),
      take: limit,
    })

    // R1 + R5: Return paginated response with versioning
    return versionedResponse(paginatedResponse(projects, page, limit, total))
  } catch (error) {
    console.error('Error fetching projects:', error)
    return versionedResponse({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    // RBAC v2: Check create permission
    const denied = await requirePermission(session, 'projects', 'create')
    if (denied) return denied

    const data = await request.json()

    // R2: Field-level validation
    const requiredErrors = validateRequired(data, [
      { field: 'name', label: 'שם פרויקט' },
    ])
    if (requiredErrors.length > 0) {
      return validationError(requiredErrors)
    }
    const { buildings, quarters, managerIds, ...projectData } = data

    let projectNumber: string

    if (projectData.parentId) {
      const parent = await prisma.project.findUnique({
        where: { id: projectData.parentId },
        select: { projectNumber: true, level: true, projectType: true }
      })

      if (!parent) {
        return NextResponse.json({ error: 'פרויקט אב לא נמצא' }, { status: 404 })
      }

      if (projectData.level === 'quarter') {
        projectNumber = await generateQuarterNumber(parent.projectNumber)
      } else if (projectData.level === 'building') {
        projectNumber = await generateBuildingNumber(parent.projectNumber)
      } else {
        projectNumber = await generateProjectNumber()
      }
    } else {
      projectNumber = await generateProjectNumber()
    }

    const project = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          projectNumber,
          name: projectData.name,
          address: projectData.address || null,
          category: projectData.category || null,
          client: projectData.client || null,
          phase: projectData.phase || null,
          state: projectData.state || 'פעיל',
          area: projectData.area ? parseFloat(String(projectData.area)) : null,
          estimatedCost: projectData.estimatedCost ? parseFloat(String(projectData.estimatedCost)) : null,
          startDate: projectData.startDate ? new Date(projectData.startDate) : null,
          description: projectData.description || null,
          projectType: projectData.projectType || 'single',
          level: projectData.level || 'project',
          parentId: projectData.parentId || null,
          leadId: projectData.leadId || null,
          services: projectData.services || [],
          buildingTypes: projectData.buildingTypes || [],
          deliveryMethods: projectData.deliveryMethods || [],
        },
      })

      await logCrud('CREATE', 'projects', 'project', project.id, `${projectNumber} - ${projectData.name}`, {
        projectNumber,
        projectType: projectData.projectType || 'single',
        level: projectData.level || 'project',
        category: projectData.category,
        client: projectData.client
      })

      await addManagersToProject(project.id, managerIds, tx)

      if (projectData.projectType === 'multi' && !projectData.parentId && buildings?.length > 0) {
        for (let i = 0; i < buildings.length; i++) {
          const building = buildings[i]
          const buildingNumber = `${projectNumber}-${String(i + 1).padStart(2, '0')}`

          const createdBuilding = await tx.project.create({
            data: {
              projectNumber: buildingNumber,
              name: building.name || `מבנה ${i + 1}`,
              address: building.address || projectData.address || null,
              category: projectData.category || null,
              client: projectData.client || null,
              phase: projectData.phase || null,
              state: projectData.state || 'פעיל',
              area: building.area ? parseFloat(String(building.area)) : null,
              estimatedCost: building.estimatedCost ? parseFloat(String(building.estimatedCost)) : null,
              startDate: projectData.startDate ? new Date(projectData.startDate) : null,
              description: building.description || null,
              projectType: 'multi',
              level: 'building',
              parentId: project.id,
              leadId: building.leadId || projectData.leadId || null,
              services: building.services || projectData.services || [],
              buildingTypes: building.buildingTypes || projectData.buildingTypes || [],
              deliveryMethods: building.deliveryMethods || projectData.deliveryMethods || [],
            },
          })

          await logCrud('CREATE', 'projects', 'building', createdBuilding.id, `${buildingNumber} - ${building.name || `מבנה ${i + 1}`}`, {
            parentProject: projectNumber,
            buildingNumber
          })

          await addManagersToProject(createdBuilding.id, building.managerIds, tx)
        }
      }

      if (projectData.projectType === 'mega' && !projectData.parentId && quarters?.length > 0) {
        for (let qIndex = 0; qIndex < quarters.length; qIndex++) {
          const quarter = quarters[qIndex]
          const quarterLetter = String.fromCharCode(65 + qIndex)
          const quarterNumber = `${projectNumber}-${quarterLetter}`

          const createdQuarter = await tx.project.create({
            data: {
              projectNumber: quarterNumber,
              name: quarter.name || `אזור ${quarterLetter}`,
              address: quarter.address || projectData.address || null,
              category: projectData.category || null,
              client: projectData.client || null,
              phase: projectData.phase || null,
              state: projectData.state || 'פעיל',
              estimatedCost: quarter.estimatedCost ? parseFloat(String(quarter.estimatedCost)) : null,
              projectType: 'mega',
              level: 'quarter',
              parentId: project.id,
              leadId: quarter.leadId || projectData.leadId || null,
            },
          })

          await logCrud('CREATE', 'projects', 'quarter', createdQuarter.id, `${quarterNumber} - ${quarter.name || `אזור ${quarterLetter}`}`, {
            parentProject: projectNumber,
            quarterNumber
          })

          await addManagersToProject(createdQuarter.id, quarter.managerIds, tx)

          if (quarter.buildings?.length > 0) {
            for (let bIndex = 0; bIndex < quarter.buildings.length; bIndex++) {
              const building = quarter.buildings[bIndex]
              const buildingNumber = `${quarterNumber}-${String(bIndex + 1).padStart(2, '0')}`

              const createdBuilding = await tx.project.create({
                data: {
                  projectNumber: buildingNumber,
                  name: building.name || `מבנה ${bIndex + 1}`,
                  address: building.address || quarter.address || projectData.address || null,
                  category: projectData.category || null,
                  client: projectData.client || null,
                  phase: projectData.phase || null,
                  state: projectData.state || 'פעיל',
                  area: building.area ? parseFloat(String(building.area)) : null,
                  estimatedCost: building.estimatedCost ? parseFloat(String(building.estimatedCost)) : null,
                  description: building.description || null,
                  projectType: 'mega',
                  level: 'building',
                  parentId: createdQuarter.id,
                  leadId: building.leadId || quarter.leadId || projectData.leadId || null,
                  services: building.services || projectData.services || [],
                  buildingTypes: building.buildingTypes || [],
                  deliveryMethods: building.deliveryMethods || [],
                },
              })

              await logCrud('CREATE', 'projects', 'building', createdBuilding.id, `${buildingNumber} - ${building.name || `מבנה ${bIndex + 1}`}`, {
                parentQuarter: quarterNumber,
                buildingNumber
              })

              await addManagersToProject(createdBuilding.id, building.managerIds, tx)
            }
          }
        }
      }

      return project
    })

    // R5: Versioned response with 201 status
    return versionedResponse(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return versionedResponse({ error: 'Failed to create project' }, { status: 500 })
  }
}
