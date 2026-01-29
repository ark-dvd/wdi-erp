'use client'

// Version: 20260129-COUNTING-FIX
// Fix: Sticky table header (moved to sticky section), Pagination (50 per page)
// Fix: Use projectNumber-based counting for consistency

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Eye, Edit, ChevronDown, ChevronLeft, ChevronUp, FolderKanban, Building2, Layers } from 'lucide-react'

// ============ COUNTING PATTERNS (must match src/lib/project-counting.ts) ============
const PROJECT_PATTERN = /^\d{4}$/
const BUILDING_PATTERN = /^\d{4}-\d{2}$/
const MEGA_BUILDING_PATTERN = /^\d{4}-[A-Z]-\d{2}$/

function isProjectNumber(projectNumber: string): boolean {
  return PROJECT_PATTERN.test(projectNumber)
}

function isBuildingNumber(projectNumber: string): boolean {
  return BUILDING_PATTERN.test(projectNumber) || MEGA_BUILDING_PATTERN.test(projectNumber)
}

interface Project {
  id: string
  projectNumber: string
  name: string
  address: string | null
  category: string | null
  client: string | null
  phase: string | null
  state: string
  projectType: string
  level: string
  startDate: string | null
  updatedAt: string
  lead: { id: string; firstName: string; lastName: string } | null
  updatedBy: { 
    id: string
    name: string | null
    employee: { firstName: string; lastName: string } | null 
  } | null
  children: Project[]
  _count: { events: number }
}

type SortField = 'projectNumber' | 'name' | 'startDate' | 'state' | 'lead' | 'updatedAt' | 'events'
type SortDirection = 'asc' | 'desc'

const ITEMS_PER_PAGE = 50

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsApiTotal, setProjectsApiTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('projectNumber')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchProjects()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, stateFilter])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?level=main')
      if (res.ok) {
        const data = await res.json()
        // MAYBACH: Handle paginated response format { items: [...], pagination: {...} }
        const items = data.items || data
        setProjects(items)
        // PAGINATION FIX: Track API total for hierarchical data
        setProjectsApiTotal(data.pagination?.total ?? (Array.isArray(items) ? items.length : 0))
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedProjects(newExpanded)
  }

  // Count projects and buildings based on projectNumber format
  // PROJECT: exactly 4 digits (e.g., 1293, 3414)
  // BUILDING: 4 digits + number suffix (e.g., 5324-03, 3414-A-04)
  // ZONE: 4 digits + letter (e.g., 3414-A) - NOT counted
  // Single-building project: 4 digits with no children - counts as BOTH project AND building
  const countProjectsAndBuildings = () => {
    let projectCount = 0
    let buildingCount = 0

    const countRecursive = (items: Project[]) => {
      items.forEach(item => {
        if (isProjectNumber(item.projectNumber)) {
          // This is a 4-digit project
          projectCount++
          // If no children, also counts as a building (single-building project)
          if (!item.children || item.children.length === 0) {
            buildingCount++
          }
        } else if (isBuildingNumber(item.projectNumber)) {
          // This is a building (has number suffix)
          buildingCount++
        }
        // Zones (4 digits + letter only) are NOT counted

        if (item.children?.length > 0) {
          countRecursive(item.children)
        }
      })
    }

    countRecursive(projects)
    return { projectCount, buildingCount }
  }

  const { projectCount, buildingCount } = countProjectsAndBuildings()

  // Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortValue = (project: Project, field: SortField): string | number => {
    switch (field) {
      case 'projectNumber':
        return project.projectNumber
      case 'name':
        return project.name
      case 'startDate':
        return project.startDate || ''
      case 'state':
        return project.state
      case 'lead':
        return project.lead ? `${project.lead.firstName} ${project.lead.lastName}` : ''
      case 'updatedAt':
        return project.updatedAt || ''
      case 'events':
        return project._count?.events || 0
      default:
        return ''
    }
  }

  const sortedProjects = [...projects].filter((project) => {
    const matchesSearch =
      searchTerm === '' ||
      project.name.includes(searchTerm) ||
      project.projectNumber.includes(searchTerm) ||
      project.client?.includes(searchTerm)

    const matchesState = stateFilter === '' || project.state === stateFilter

    return matchesSearch && matchesState
  }).sort((a, b) => {
    const aValue = getSortValue(a, sortField)
    const bValue = getSortValue(b, sortField)

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    const comparison = String(aValue).localeCompare(String(bValue), 'he')
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Pagination
  const totalPages = Math.ceil(sortedProjects.length / ITEMS_PER_PAGE)
  const paginatedProjects = sortedProjects.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const getStateClass = (state: string) => {
    switch (state) {
      case 'פעיל':
        return 'state-active'
      case 'הושלם':
        return 'state-completed'
      case 'מושהה':
        return 'state-paused'
      case 'בוטל':
        return 'state-cancelled'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('he-IL')
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return '-'
    const d = new Date(date)
    return `${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
  }

  const getUpdatedByName = (project: Project) => {
    if (!project.updatedBy) return '-'
    if (project.updatedBy.employee) {
      return `${project.updatedBy.employee.firstName} ${project.updatedBy.employee.lastName}`
    }
    return project.updatedBy.name || '-'
  }

  const getIcon = (project: Project) => {
    if (project.projectType === 'mega' && project.level === 'project') return <Layers size={18} className="text-[#0a3161]" />
    if (project.level === 'building') return <Building2 size={18} className="text-[#0a3161]" />
    return <FolderKanban size={18} className="text-[#0a3161]" />
  }

  const renderProject = (project: Project, depth: number = 0) => {
    const hasChildren = project.children && project.children.length > 0
    const isExpanded = expandedProjects.has(project.id)

    return (
      <div key={project.id}>
        <div
          className={`grid grid-cols-[24px_20px_2fr_1fr_80px_1fr_1fr_1fr_80px_80px] items-center gap-3 p-3 hover:bg-[#f5f6f8] border-b border-[#e2e4e8] cursor-pointer transition-colors ${
            depth > 0 ? 'bg-[#f5f6f8]/50' : ''
          }`}
          style={{ paddingRight: `${12 + depth * 24}px` }}
          onClick={() => router.push(`/dashboard/projects/${project.id}`)}
        >
          {/* Expand Button */}
          <div onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(project.id) }}>
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={18} className="text-[#a7a7b0] hover:text-[#0a3161]" />
              ) : (
                <ChevronLeft size={18} className="text-[#a7a7b0] hover:text-[#0a3161]" />
              )
            ) : (
              <div className="w-[18px]" />
            )}
          </div>

          {/* Icon */}
          <div>{getIcon(project)}</div>

          {/* Project Name and Number */}
          <div className="min-w-0">
            <div className="font-medium text-[#3a3a3d] truncate">{project.name}</div>
            <div className="text-sm text-[#8f8f96]" dir="ltr">#{project.projectNumber}</div>
            {project.client && (
              <div className="text-xs text-[#a7a7b0]">{project.client}</div>
            )}
          </div>

          {/* Start Date */}
          <div className="text-sm text-[#3a3a3d]">{formatDate(project.startDate)}</div>

          {/* State */}
          <div>
            <span className={`state-badge ${getStateClass(project.state)}`}>
              {project.state}
            </span>
          </div>

          {/* Lead */}
          <div className="text-sm text-[#3a3a3d]">
            {project.lead ? `${project.lead.firstName} ${project.lead.lastName}` : '-'}
          </div>

          {/* Updated At */}
          <div className="text-sm text-[#8f8f96]">{formatDateTime(project.updatedAt)}</div>

          {/* Updated By */}
          <div className="text-sm text-[#8f8f96]">{getUpdatedByName(project)}</div>

          {/* Events Count */}
          <div className="text-center text-sm text-[#3a3a3d]">{project._count?.events || 0}</div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/projects/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-[#a7a7b0] hover:text-[#0a3161] transition-colors"
              title="צפייה"
            >
              <Eye size={18} />
            </Link>
            <Link
              href={`/dashboard/projects/${project.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-[#a7a7b0] hover:text-[#0a3161] transition-colors"
              title="עריכה"
            >
              <Edit size={18} />
            </Link>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {project.children.map((child) => renderProject(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a3161]"></div>
      </div>
    )
  }

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh)]">
      {/* Sticky Top Section */}
      <div className="flex-shrink-0 bg-[#f5f6f8] p-6 pb-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#3a3a3d]">פרויקטים</h1>
            <p className="text-[#8f8f96] mt-1">{(searchTerm || stateFilter) ? projectCount.toLocaleString('he-IL') : (projectsApiTotal || projectCount).toLocaleString('he-IL')} פרויקטים, {buildingCount.toLocaleString('he-IL')} מבנים</p>
          </div>
          <Link href="/dashboard/projects/new" className="btn btn-primary">
            <Plus size={20} />
            פרויקט חדש
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#e2e4e8] p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a7a7b0]"
                size={20}
              />
              <input
                type="text"
                placeholder="חיפוש לפי שם, מספר או לקוח..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
              />
            </div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-4 py-2 border border-[#e2e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a3161]/20 focus:border-[#0a3161]"
            >
              <option value="">כל המצבים</option>
              <option value="פעיל">פעיל</option>
              <option value="הושלם">הושלם</option>
              <option value="מושהה">מושהה</option>
              <option value="בוטל">בוטל</option>
            </select>
          </div>
        </div>

        {/* Table Header - Sticky */}
        <div className="bg-white rounded-t-xl border border-b-0 border-[#e2e4e8]">
          <div className="grid grid-cols-[24px_20px_2fr_1fr_80px_1fr_1fr_1fr_80px_80px] items-center gap-3 p-3 bg-[#f5f6f8] text-sm text-[#3a3a3d] font-medium rounded-t-xl">
            <div></div>
            <div></div>
            <div
              onClick={() => handleSort('name')}
              className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"
            >
              <span>פרויקט</span>
              {sortField === 'name' && (
                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </div>
            <div
              onClick={() => handleSort('startDate')}
              className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"
            >
              <span>תאריך התחלה</span>
              {sortField === 'startDate' && (
                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </div>
            <div
              onClick={() => handleSort('state')}
              className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"
            >
              <span>מצב</span>
              {sortField === 'state' && (
                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </div>
            <div
              onClick={() => handleSort('lead')}
              className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"
            >
              <span>מוביל/ת</span>
              {sortField === 'lead' && (
                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </div>
            <div
              onClick={() => handleSort('updatedAt')}
              className="flex items-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"
            >
              <span>עודכן</span>
              {sortField === 'updatedAt' && (
                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </div>
            <div className="text-sm">ע"י</div>
            <div
              onClick={() => handleSort('events')}
              className="flex items-center justify-center gap-1 cursor-pointer hover:text-[#0a3161] select-none"
            >
              <span>אירועים</span>
              {sortField === 'events' && (
                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </div>
            <div>פעולות</div>
          </div>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="bg-white rounded-b-xl border border-t-0 border-[#e2e4e8]">
          {/* Projects List */}
          {paginatedProjects.length === 0 ? (
            <div className="text-center py-12 text-[#8f8f96]">לא נמצאו פרויקטים</div>
          ) : (
            paginatedProjects.map((project) => renderProject(project))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-[#e2e4e8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              הקודם
            </button>
            <span className="px-4 py-2">עמוד {page} מתוך {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-[#e2e4e8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              הבא
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
