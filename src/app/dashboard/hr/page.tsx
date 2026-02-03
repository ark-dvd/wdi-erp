'use client'

// ================================================
// WDI ERP - HR List Page
// Version: 20260202-RBAC-V2-PHASE6
// RBAC v2: Scope-based PII gating (DOC-016 §6.1, FP-002)
// ================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import SortableTable, { Column } from '@/components/SortableTable'
import { getHRScope } from '@/lib/ui-permissions'

interface Project {
  id: string
  name: string
  projectNumber: string
  state: string
}

interface ManagedProject {
  project: Project
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  idNumber: string
  role: string
  department: string | null
  phone: string | null
  email: string | null
  status: string
  photoUrl: string | null
  birthDate: string | null
  startDate: string | null
  updatedAt: string | null
  // Note: Employee model doesn't have updatedBy in schema
  managedProjects: ManagedProject[]
  ledProjects: Project[]
  age?: number | null
}

export default function HRPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeesTotal, setEmployeesTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // #9: ברירת מחדל "פעיל"
  const [statusFilter, setStatusFilter] = useState<string>('פעיל')

  // RBAC v2 / Phase 6: HR scope-based PII gating
  const permissions = (session?.user as any)?.permissions as string[] | undefined
  const hrScope = getHRScope(permissions)
  // showSensitiveHR = true for ALL or SELF scopes, false for MAIN_PAGE or null
  const showSensitiveHR = hrScope === 'ALL' || hrScope === 'SELF'

  // Pagination state
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const ITEMS_PER_PAGE = 20

  // #4: מודאל מחיקה מעוצב
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1) // Reset to page 1 when search changes
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch data when filters/pagination change
  useEffect(() => {
    fetchEmployees()
  }, [debouncedSearch, statusFilter, page])

  // Build query string for API
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', ITEMS_PER_PAGE.toString())
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (statusFilter) params.set('status', statusFilter)
    return params.toString()
  }, [page, debouncedSearch, statusFilter])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const query = buildQuery()
      const res = await fetch(`/api/hr?${query}`)
      if (res.ok) {
        const data = await res.json()
        const items = data.items || data
        setEmployees(items)
        const pagination = data.pagination
        if (pagination) {
          setEmployeesTotal(pagination.total)
          setPages(pagination.pages)
          setHasNext(pagination.hasNext)
        } else {
          setEmployeesTotal(Array.isArray(items) ? items.length : 0)
          setPages(1)
          setHasNext(false)
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  // #4: מודאל מחיקה מעוצב
  const openDeleteModal = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!employeeToDelete) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/hr/${employeeToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowDeleteModal(false)
        setEmployeeToDelete(null)
        // Refresh current page data from server
        fetchEmployees()
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
    } finally {
      setDeleting(false)
    }
  }

  // Status filter handler - reset to page 1
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  // #12: תיקון תאריכים - שימוש ב-UTC למניעת הזזת יום
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const day = date.getUTCDate().toString().padStart(2, '0')
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${day}.${month}.${year}`
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // #2: חישוב גיל כמספר לצורך מיון
  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getUTCFullYear()
    const monthDiff = today.getMonth() - birth.getUTCMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate())) {
      age--
    }
    return age
  }

  const calculateSeniority = (startDate: string | null) => {
    if (!startDate) return '-'
    const start = new Date(startDate)
    const today = new Date()
    
    let years = today.getFullYear() - start.getUTCFullYear()
    let months = today.getMonth() - start.getUTCMonth()
    
    if (months < 0) {
      years--
      months += 12
    }
    
    if (today.getDate() < start.getUTCDate()) {
      months--
      if (months < 0) {
        years--
        months += 12
      }
    }
    
    if (years === 0) {
      return `${months} ח׳`
    } else if (months === 0) {
      return `${years} ש׳`
    } else {
      return `${years} ש׳ ${months} ח׳`
    }
  }

  const getEmployeeProjects = (employee: Employee): string => {
    const projects: string[] = []
    
    if (employee.ledProjects) {
      employee.ledProjects.forEach(p => {
        if (p.state === 'פעיל') {
          projects.push(p.name)
        }
      })
    }
    
    if (employee.managedProjects) {
      employee.managedProjects.forEach(mp => {
        if (mp.project.state === 'פעיל' && !projects.includes(mp.project.name)) {
          projects.push(mp.project.name)
        }
      })
    }
    
    if (projects.length === 0) return '-'
    if (projects.length === 1) return projects[0]
    return `${projects[0]} (+${projects.length - 1})`
  }

  // Server-side pagination - data comes pre-filtered from API
  // No client-side filtering needed

  // #1: כותרת משנה דינמית לפי מסנן
  // Server-side pagination: always use employeesTotal from API
  const getSubtitle = () => {
    const count = employeesTotal.toLocaleString('he-IL')
    if (statusFilter === '') {
      return `${count} עובדים`
    }
    if (statusFilter === 'פעיל') {
      return `${count} עובדים פעילים`
    }
    if (statusFilter === 'לא פעיל') {
      return `${count} עובדים לא פעילים`
    }
    if (statusFilter === 'בחופשה') {
      return `${count} עובדים בחופשה`
    }
    return `${count} עובדים`
  }

  // RBAC v2 / Phase 6: Build columns based on HR scope
  // PII columns (birthDate, age) hidden for MAIN_PAGE users
  const columns: Column<Employee>[] = useMemo(() => {
    const baseColumns: Column<Employee>[] = [
      {
        key: 'lastName',
        label: 'שם',
        render: (item) => (
          <div className="flex items-center gap-3">
            {item.photoUrl ? (
              <img
                src={`/api/file?url=${encodeURIComponent(item.photoUrl)}`}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">
                  {(item.firstName || '?')[0]}{(item.lastName || '?')[0]}
                </span>
              </div>
            )}
            <p className="font-medium">{item.lastName || ''} {item.firstName || ''}</p>
          </div>
        ),
      },
      {
        key: 'role',
        label: 'תפקיד',
      },
    ]

    // PII columns - only for ALL/SELF scopes
    if (showSensitiveHR) {
      baseColumns.push(
        {
          key: 'birthDate',
          label: 'תאריך לידה',
          render: (item) => formatDate(item.birthDate),
        },
        {
          // #2: עמודת גיל ממוינת - שימוש בערך מספרי
          key: 'age',
          label: 'גיל',
          sortable: true,
          render: (item) => {
            const age = calculateAge(item.birthDate)
            return age !== null ? age : '-'
          },
        }
      )
    }

    // Non-PII columns
    baseColumns.push(
      {
        key: 'startDate',
        label: 'תאריך הצטרפות',
        render: (item) => formatDate(item.startDate),
      },
      {
        // מיון ותק - לפי חודשים
        key: 'seniorityMonths',
        label: 'ותק',
        sortable: true,
        render: (item) => calculateSeniority(item.startDate),
      },
      {
        key: 'projects',
        label: 'פרויקט נוכחי',
        sortable: false,
        render: (item) => getEmployeeProjects(item),
      },
      {
        key: 'status',
        label: 'סטטוס',
        render: (item) => (
          <span className={`badge ${
            item.status === 'פעיל' ? 'badge-active' :
            item.status === 'לא פעיל' ? 'badge-inactive' :
            'badge-pending'
          }`}>
            {item.status}
          </span>
        ),
      },
      {
        key: 'updatedAt',
        label: 'עודכן',
        sortable: true,
        render: (item) => (
          <div className="text-sm text-gray-500">{formatDateTime(item.updatedAt)}</div>
        ),
      },
      {
        // #3: עמודת פעולות - הסרת עין, עריכה ומחיקה בלבד
        key: 'actions',
        label: 'פעולות',
        sortable: false,
        render: (item) => (
          <div className="flex items-center gap-2">
            {/* #3: עריכה מובילה ישירות למסך עריכה */}
            <Link
              href={`/dashboard/hr/${item.id}/edit`}
              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
              title="עריכה"
              onClick={(e) => e.stopPropagation()}
            >
              <Edit size={18} />
            </Link>
            {/* #4: מחיקה פותחת מודאל מעוצב */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                openDeleteModal(item)
              }}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="מחיקה"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ),
      }
    )

    return baseColumns
  }, [showSensitiveHR])

  // חישוב ותק בחודשים לצורך מיון
  const calculateSeniorityMonths = (startDate: string | null): number | null => {
    if (!startDate) return null
    const start = new Date(startDate)
    const today = new Date()
    const years = today.getFullYear() - start.getUTCFullYear()
    const months = today.getMonth() - start.getUTCMonth()
    let totalMonths = years * 12 + months
    if (today.getDate() < start.getUTCDate()) totalMonths--
    return totalMonths
  }

  // #2: הוספת שדה age ו-seniorityMonths לנתונים לצורך מיון
  // Server-side pagination: use employees directly (already filtered by server)
  const employeesWithAge = employees.map(emp => ({
    ...emp,
    age: calculateAge(emp.birthDate),
    seniorityMonths: calculateSeniorityMonths(emp.startDate)
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh)]">
      {/* Sticky Top Section - Header + Filters */}
      <div className="flex-shrink-0 bg-gray-50 p-6 pb-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ניהול כוח אדם</h1>
            {/* #1: כותרת משנה דינמית */}
            <p className="text-gray-500 mt-1">{getSubtitle()}</p>
          </div>
          <Link href="/dashboard/hr/new" className="btn btn-primary">
            <Plus size={20} />
            הוספת עובד
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="חיפוש לפי שם, ת.ז., טלפון או אימייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* #9: ברירת מחדל "פעיל" */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">כל הסטטוסים</option>
              <option value="פעיל">פעיל</option>
              <option value="לא פעיל">לא פעיל</option>
              <option value="בחופשה">בחופשה</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable Table */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <SortableTable
            data={employeesWithAge}
            columns={columns}
            keyField="id"
            onRowClick={(item) => router.push(`/dashboard/hr/${item.id}`)}
            emptyMessage={loading ? 'טוען...' : 'לא נמצאו עובדים'}
          />
        </div>

        {/* Pagination Controls */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500">
              עמוד {page.toLocaleString('he-IL')} מתוך {pages.toLocaleString('he-IL')} ({employeesTotal.toLocaleString('he-IL')} עובדים)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
                הקודם
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNext || loading}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                הבא
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* #4: מודאל מחיקה מעוצב */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-xl font-bold">מחיקת עובד</h3>
            </div>
            <p className="text-gray-700 mb-2">
              האם אתה בטוח שברצונך למחוק את העובד{' '}
              <strong>{employeeToDelete.firstName} {employeeToDelete.lastName}</strong>?
            </p>
            <p className="text-gray-500 text-sm mb-6">פעולה זו אינה ניתנת לביטול.</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setEmployeeToDelete(null)
                }}
                className="btn btn-secondary"
                disabled={deleting}
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={deleting}
              >
                {deleting ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
