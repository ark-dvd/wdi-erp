import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const API_KEY = process.env.EMAIL_ADDON_API_KEY || 'wdi-email-addon-secret-2024'

// סוגי אירועים זמינים (בלי "מייל" - יימחק בהמשך)
const EVENT_TYPES = [
  'אתגר',
  'תיעוד', 
  'החלטה',
  'לקוח',
  'בטיחות',
  'סיכום פגישה',
  'אדמיניסטרציה',
  'גבייה',
  'אחר'
]

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const apiKeyHeader = request.headers.get('X-API-Key')
    if (!(authHeader === `Bearer ${API_KEY}` || apiKeyHeader === API_KEY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: {
        state: 'פעיל',
        level: { in: ['project', 'quarter'] }
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        level: true,
        parentId: true,
      },
      orderBy: { projectNumber: 'asc' }
    })

    const formattedProjects = projects.map(p => ({
      id: p.id,
      label: `${p.projectNumber} - ${p.name}`,
      level: p.level
    }))

    return NextResponse.json({
      projects: formattedProjects,
      eventTypes: EVENT_TYPES
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}