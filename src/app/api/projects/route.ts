import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

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

async function addManagersToProject(projectId: string, managerIds: string[]) {
  if (!managerIds || managerIds.length === 0) return
  
  for (const managerId of managerIds) {
    await prisma.projectManager.create({
      data: {
        projectId,
        employeeId: managerId,
      },
    })
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const category = searchParams.get('category')
    const level = searchParams.get('level')

    const where: any = {}
    if (state) where.state = state
    if (category) where.category = category
    if (level === 'main') where.parentId = null

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
      orderBy: { projectNumber: 'asc' },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
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

    const project = await prisma.project.create({
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

    // תיעוד יצירת פרויקט
    await logCrud('CREATE', 'projects', 'project', project.id, `${projectNumber} - ${projectData.name}`, {
      projectNumber,
      projectType: projectData.projectType || 'single',
      level: projectData.level || 'project',
      category: projectData.category,
      client: projectData.client
    })

    await addManagersToProject(project.id, managerIds)

    if (projectData.projectType === 'multi' && !projectData.parentId && buildings?.length > 0) {
      for (let i = 0; i < buildings.length; i++) {
        const building = buildings[i]
        const buildingNumber = `${projectNumber}-${String(i + 1).padStart(2, '0')}`
        
        const createdBuilding = await prisma.project.create({
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

        await addManagersToProject(createdBuilding.id, building.managerIds)
      }
    }

    if (projectData.projectType === 'mega' && !projectData.parentId && quarters?.length > 0) {
      for (let qIndex = 0; qIndex < quarters.length; qIndex++) {
        const quarter = quarters[qIndex]
        const quarterLetter = String.fromCharCode(65 + qIndex)
        const quarterNumber = `${projectNumber}-${quarterLetter}`

        const createdQuarter = await prisma.project.create({
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

        await addManagersToProject(createdQuarter.id, quarter.managerIds)

        if (quarter.buildings?.length > 0) {
          for (let bIndex = 0; bIndex < quarter.buildings.length; bIndex++) {
            const building = quarter.buildings[bIndex]
            const buildingNumber = `${quarterNumber}-${String(bIndex + 1).padStart(2, '0')}`

            const createdBuilding = await prisma.project.create({
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

            await addManagersToProject(createdBuilding.id, building.managerIds)
          }
        }
      }
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}