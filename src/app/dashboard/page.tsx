import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getProjectAndBuildingCounts } from '@/lib/project-counting'
import Link from 'next/link'
import {
  Users,
  FolderKanban,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Building2,
} from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()

  // קבלת סטטיסטיקות
  // Use single source of truth for project/building counts
  const [employeeCount, { projectCount, buildingCount }, eventCount, { projectCount: activeProjects }] = await Promise.all([
    prisma.employee.count({ where: { status: 'פעיל' } }),
    getProjectAndBuildingCounts(),
    prisma.projectEvent.count(),
    getProjectAndBuildingCounts({ state: 'פעיל' }),
  ])

  const stats = [
    {
      name: 'עובדים פעילים',
      value: employeeCount,
      icon: Users,
      href: '/dashboard/hr',
      color: 'bg-blue-500',
    },
    {
      name: 'פרויקטים',
      value: projectCount,
      icon: FolderKanban,
      href: '/dashboard/projects',
      color: 'bg-green-500',
    },
    {
      name: 'מבנים',
      value: buildingCount,
      icon: Building2,
      href: '/dashboard/projects',
      color: 'bg-teal-500',
    },
    {
      name: 'פרויקטים פעילים',
      value: activeProjects,
      icon: TrendingUp,
      href: '/dashboard/projects?state=פעיל',
      color: 'bg-purple-500',
    },
    {
      name: 'אירועים',
      value: eventCount,
      icon: Calendar,
      href: '/dashboard/events',
      color: 'bg-orange-500',
    },
  ]

  // אירועים אחרונים
  const recentEvents = await prisma.projectEvent.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      project: { select: { name: true, projectNumber: true } },
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          שלום, {session?.user?.employeeName || session?.user?.name}
        </h1>
        <p className="text-gray-500 mt-1">
          ברוכים הבאים למערכת WDI ERP
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Recent Events */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">אירועים אחרונים</h2>
          <Link href="/dashboard/events" className="text-blue-600 text-sm hover:underline">
            צפה בכל האירועים
          </Link>
        </div>
        
        {recentEvents.length === 0 ? (
          <p className="text-gray-500 text-center py-8">אין אירועים עדיין</p>
        ) : (
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className={`p-2 rounded-lg ${
                  event.eventType === 'אתגר' ? 'bg-red-100 text-red-600' :
                  event.eventType === 'החלטה' ? 'bg-blue-100 text-blue-600' :
                  event.eventType === 'בטיחות' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {event.eventType === 'אתגר' ? <AlertCircle size={20} /> :
                   event.eventType === 'החלטה' ? <CheckCircle size={20} /> :
                   <Calendar size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {event.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {event.project.name} ({event.project.projectNumber})
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(event.eventDate).toLocaleDateString('he-IL')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
