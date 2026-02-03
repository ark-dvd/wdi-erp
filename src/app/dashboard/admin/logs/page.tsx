// ================================================
// WDI ERP - Admin Activity Logs Page
// Version: 20260202-RBAC-V2-PHASE6
// RBAC v2: Permission-based admin gating (DOC-016 §6.1, FP-002)
// ================================================
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePageView } from '@/hooks/useActivityLog'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Download, Eye, RefreshCw, ArrowRight } from 'lucide-react'
import { canAccessAdmin } from '@/lib/ui-permissions'
import NoAccessPage from '@/components/NoAccessPage'

interface ActivityLog {
  id: string
  userEmail: string
  userRole: string | null
  action: string
  category: string
  module: string | null
  path: string | null
  targetType: string | null
  targetId: string | null
  targetName: string | null
  details: any
  ip: string | null
  duration: number | null
  success: boolean
  createdAt: string
  user: {
    name: string | null
    employee: {
      firstName: string
      lastName: string
    } | null
  } | null
}

interface Stats {
  counts: { today: number; week: number; month: number; total: number }
  activeUsersToday: number
}

const actionColors: Record<string, string> = {
  LOGIN_SUCCESS: 'bg-green-100 text-green-800',
  LOGIN_FAIL: 'bg-red-100 text-red-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  PAGE_VIEW: 'bg-blue-100 text-blue-800',
  CREATE: 'bg-emerald-100 text-emerald-800',
  READ: 'bg-sky-100 text-sky-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  SEARCH: 'bg-purple-100 text-purple-800',
  FILTER: 'bg-purple-100 text-purple-800',
  UPLOAD: 'bg-indigo-100 text-indigo-800',
  DOWNLOAD: 'bg-indigo-100 text-indigo-800',
  QUERY: 'bg-pink-100 text-pink-800',
  EXPORT: 'bg-orange-100 text-orange-800',
}

const actionLabels: Record<string, string> = {
  LOGIN_SUCCESS: 'כניסה',
  LOGIN_FAIL: 'כניסה נכשלה',
  LOGOUT: 'יציאה',
  PAGE_VIEW: 'צפייה בדף',
  CREATE: 'יצירה',
  READ: 'קריאה',
  UPDATE: 'עדכון',
  DELETE: 'מחיקה',
  SEARCH: 'חיפוש',
  FILTER: 'סינון',
  UPLOAD: 'העלאה',
  DOWNLOAD: 'הורדה',
  QUERY: 'שאילתת Agent',
  EXPORT: 'ייצוא',
}

const moduleLabels: Record<string, string> = {
  contacts: 'אנשי קשר',
  organizations: 'ארגונים',
  vehicles: 'רכבים',
  'vendor-rating': 'דירוג ספקים',
  hr: 'כוח אדם',
  projects: 'פרויקטים',
  events: 'אירועים',
  agent: 'Agent',
  admin: 'ניהול',
  settings: 'הגדרות',
  files: 'קבצים',
  auth: 'אימות',
}

const fieldLabels: Record<string, string> = {
  firstName: 'שם פרטי',
  lastName: 'שם משפחה',
  phone: 'טלפון',
  email: 'אימייל',
  address: 'כתובת',
  role: 'תפקיד',
  department: 'מחלקה',
  status: 'סטטוס',
  grossSalary: 'שכר',
  spouseFirstName: 'שם בן/ת זוג',
  spouseLastName: 'שם משפחה בן/ת זוג',
  spousePhone: 'טלפון בן/ת זוג',
  spouseEmail: 'אימייל בן/ת זוג',
  birthDate: 'תאריך לידה',
  startDate: 'תאריך התחלה',
  endDate: 'תאריך סיום',
  name: 'שם',
  state: 'מצב',
  phase: 'שלב',
  client: 'לקוח',
  category: 'קטגוריה',
  leadId: 'מוביל',
  projectNumber: 'מספר פרויקט',
  eventType: 'סוג אירוע',
}

function getSummary(log: ActivityLog): string {
  // PAGE_VIEW
  if (log.action === 'PAGE_VIEW') {
    const path = log.path || ''
    if (path.includes('/hr')) return 'צפייה בכוח אדם'
    if (path.includes('/projects')) return 'צפייה בפרויקטים'
    if (path.includes('/events')) return 'צפייה באירועים'
    if (path.includes('/backoffice/logs')) return 'צפייה ביומן'
    if (path.includes('/backoffice')) return 'צפייה בניהול'
    if (path.includes('/agent')) return 'צפייה ב-Agent'
    if (path.includes('/settings')) return 'צפייה בהגדרות'
    return path.split('/').pop() || 'צפייה בדף'
  }

  // LOGIN
  if (log.action === 'LOGIN_SUCCESS') return 'כניסה למערכת'
  if (log.action === 'LOGIN_FAIL') {
    const reason = log.details?.reason
    if (reason === 'domain_not_allowed') return 'דומיין לא מורשה'
    if (reason === 'user_not_registered') return 'משתמש לא רשום'
    return 'כניסה נכשלה'
  }

  // CREATE
  if (log.action === 'CREATE') {
    return `נוצר: ${log.targetName || log.targetType || 'רשומה'}`
  }

  // DELETE
  if (log.action === 'DELETE') {
    return `נמחק: ${log.targetName || log.targetType || 'רשומה'}`
  }

  // UPDATE - show changed fields
  if (log.action === 'UPDATE' && log.details?.changes) {
    const changedFields = Object.keys(log.details.changes)
    if (changedFields.length === 0) return 'עדכון ללא שינויים'
    
    const fieldNames = changedFields
      .slice(0, 3)
      .map(f => fieldLabels[f] || f)
      .join(', ')
    
    if (changedFields.length > 3) {
      return `עודכנו: ${fieldNames} (+${changedFields.length - 3})`
    }
    return `עודכנו: ${fieldNames}`
  }

  // QUERY
  if (log.action === 'QUERY') {
    const question = log.details?.question || ''
    return question.length > 40 ? question.substring(0, 40) + '...' : question || 'שאילתה'
  }

  // Default
  return log.targetName || log.path || '-'
}

export default function BackOfficeLogsPage() {
  const { data: session, status } = useSession()
  usePageView('admin')
  const router = useRouter()
  
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterModule, setFilterModule] = useState('')
  
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)

  // RBAC v2 / Phase 6: Permission-based admin gating
  const permissions = (session?.user as any)?.permissions as string[] | undefined
  const hasAdminAccess = canAccessAdmin(permissions)

  useEffect(() => {
    if (status === 'authenticated' && !hasAdminAccess) {
      router.push('/dashboard')
    }
  }, [status, hasAdminAccess, router])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '50' })
      if (search) params.set('search', search)
      if (filterAction) params.set('action', filterAction)
      if (filterModule) params.set('module', filterModule)
      
      const res = await fetch(`/api/admin/logs?${params}`)
      if (!res.ok) {
        if (res.status === 403) {
          setError('אין לך הרשאה לצפות בדף זה')
          return
        }
        throw new Error('Failed to fetch logs')
      }
      
      const data = await res.json()
      setLogs(data.logs)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    } catch (err) {
      setError('שגיאה בטעינת הלוגים')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats')
    }
  }

  useEffect(() => {
    if (hasAdminAccess) {
      fetchLogs()
      fetchStats()
    }
  }, [page, filterAction, filterModule, hasAdminAccess])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jerusalem'
    })
  }

  const getUserName = (log: ActivityLog) => {
    if (log.user?.employee) {
      return `${log.user.employee.firstName} ${log.user.employee.lastName}`
    }
    if (log.user?.name) return log.user.name
    return log.userEmail.split('@')[0]
  }

  const exportCSV = () => {
    const headers = ['#', 'זמן', 'משתמש', 'תפקיד', 'פעולה', 'מודול', 'פרטים', 'IP']
    const rows = logs.map((log, idx) => [
      total - ((page - 1) * 50) - idx,
      formatDateTime(log.createdAt),
      log.userEmail,
      log.userRole || '',
      log.action,
      log.module || '',
      getSummary(log),
      log.ip || ''
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (status === 'loading') {
    return <div className="p-8 text-center">טוען...</div>
  }

  if (!hasAdminAccess) {
    return <NoAccessPage />
  }

  if (error) {
    return <div className="p-8"><div className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</div></div>
  }

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh)]">
      {/* Sticky Top Section */}
      <div className="flex-shrink-0 bg-gray-50 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowRight size={24} />
          </Link>
          <h1 className="text-2xl font-bold">יומן פעילות</h1>
          <div className="flex-1" />
          <button onClick={() => { fetchLogs(); fetchStats() }} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} />
            רענן
          </button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download size={16} />
            ייצוא CSV
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.counts.today}</div>
              <div className="text-gray-500 text-sm">היום</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.counts.week}</div>
              <div className="text-gray-500 text-sm">השבוע</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.counts.month}</div>
              <div className="text-gray-500 text-sm">החודש</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-gray-600">{stats.activeUsersToday}</div>
              <div className="text-gray-500 text-sm">משתמשים פעילים היום</div>
            </div>
          </div>
        )}

        <div className="card p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-600 mb-1">חיפוש</label>
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חפש לפי משתמש, יעד..."
                  className="input pr-10 w-full"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">פעולה</label>
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
                className="input"
              >
                <option value="">הכל</option>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">מודול</label>
              <select
                value={filterModule}
                onChange={(e) => { setFilterModule(e.target.value); setPage(1) }}
                className="input"
              >
                <option value="">הכל</option>
                {Object.entries(moduleLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-primary">סנן</button>
          </form>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="card overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <span className="text-gray-600">{total.toLocaleString()} רשומות</span>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">טוען...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">אין רשומות</div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-420px)]">
              <table className="w-full">
                <thead className="bg-gray-50 text-right sticky top-0 z-10">
                  <tr>
                    <th className="p-3 font-medium text-gray-600 w-16 bg-gray-50">#</th>
                    <th className="p-3 font-medium text-gray-600 bg-gray-50">זמן</th>
                    <th className="p-3 font-medium text-gray-600 bg-gray-50">משתמש</th>
                    <th className="p-3 font-medium text-gray-600 bg-gray-50">פעולה</th>
                    <th className="p-3 font-medium text-gray-600 bg-gray-50">מודול</th>
                    <th className="p-3 font-medium text-gray-600 bg-gray-50">פרטים</th>
                    <th className="p-3 font-medium text-gray-600 w-12 bg-gray-50"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log, idx) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-400 font-mono">
                        {total - ((page - 1) * 50) - idx}
                      </td>
                      <td className="p-3 text-sm text-gray-500 whitespace-nowrap" dir="ltr">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{getUserName(log)}</div>
                        <div className="text-xs text-gray-500">{log.userEmail}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100'}`}>
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {log.module ? moduleLabels[log.module] || log.module : '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-600 max-w-xs truncate">
                        {getSummary(log)}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                הקודם
              </button>
              <span className="px-4 py-2">עמוד {page} מתוך {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                הבא
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-bold">פרטי פעילות #{total - logs.indexOf(selectedLog) - ((page - 1) * 50)}</h2>
              <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">זמן</div>
                  <div dir="ltr" className="text-left">{formatDateTime(selectedLog.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">משתמש</div>
                  <div>{selectedLog.userEmail}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">תפקיד</div>
                  <div>{selectedLog.userRole || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">פעולה</div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[selectedLog.action] || 'bg-gray-100'}`}>
                    {actionLabels[selectedLog.action] || selectedLog.action}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-500">מודול</div>
                  <div>{selectedLog.module ? moduleLabels[selectedLog.module] || selectedLog.module : '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">IP</div>
                  <div dir="ltr" className="text-left">{selectedLog.ip || '-'}</div>
                </div>
              </div>
              
              {selectedLog.targetName && (
                <div>
                  <div className="text-sm text-gray-500">יעד</div>
                  <div>{selectedLog.targetName}</div>
                </div>
              )}
              
              {selectedLog.path && (
                <div>
                  <div className="text-sm text-gray-500">נתיב</div>
                  <div dir="ltr" className="text-left text-sm bg-gray-100 p-2 rounded">{selectedLog.path}</div>
                </div>
              )}
              
              {selectedLog.details?.changes && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">שדות שהשתנו</div>
                  <div className="bg-gray-50 rounded-lg divide-y">
                    {Object.entries(selectedLog.details.changes).map(([field, change]: [string, any]) => (
                      <div key={field} className="p-3 flex justify-between items-center">
                        <span className="font-medium">{fieldLabels[field] || field}</span>
                        <div className="text-sm">
                          <span className="text-red-600 line-through ml-2">{change.from || '(ריק)'}</span>
                          <span className="mx-2">←</span>
                          <span className="text-green-600">{change.to || '(ריק)'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedLog.details && !selectedLog.details.changes && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">פרטים</div>
                  <pre dir="ltr" className="text-left text-sm bg-gray-100 p-3 rounded overflow-auto max-h-60">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedLog.duration && (
                <div>
                  <div className="text-sm text-gray-500">משך</div>
                  <div>{selectedLog.duration} ms</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
