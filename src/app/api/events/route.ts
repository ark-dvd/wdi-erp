import { prisma } from "@/lib/prisma"
import { auth } from '@/lib/auth'
import { NextResponse } from "next/server"

// Version: 20260111-205500 - Added auth check

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    
    const projectId = searchParams.get("project")
    const eventType = searchParams.get("type")
    const search = searchParams.get("search")
    const fromDate = searchParams.get("from")
    const toDate = searchParams.get("to")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    
    const where: any = {}
    
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
        const projectIds = [project.id]
        project.children.forEach(child => {
          projectIds.push(child.id)
          child.children.forEach(grandchild => {
            projectIds.push(grandchild.id)
          })
        })
        where.projectId = { in: projectIds }
      }
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
      if (fromDate) where.eventDate.gte = new Date(fromDate)
      if (toDate) where.eventDate.lte = new Date(toDate + "T23:59:59")
    }
    
    // ספירה כוללת
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
      orderBy: { eventDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })
    
    const eventsWithUserNames = events.map(event => ({
      ...event,
      createdByName: event.createdBy?.employee 
        ? `${event.createdBy.employee.firstName} ${event.createdBy.employee.lastName}`
        : event.createdBy?.name || event.createdBy?.email || null
    }))
    
    return NextResponse.json({
      events: eventsWithUserNames,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching events:", error)
    return NextResponse.json({ error: "שגיאה בטעינת אירועים" }, { status: 500 })
  }
}
