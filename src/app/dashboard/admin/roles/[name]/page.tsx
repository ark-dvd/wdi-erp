// ================================================
// WDI ERP - Admin Role Detail Page
// Version: 20260202-RBAC-V2-PHASE6
// RBAC v2: Permission-based admin gating (DOC-016 §6.1, FP-002)
// ================================================

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { usePageView } from '@/hooks/useActivityLog'
import { Shield, Loader2, Users, User as UserIcon } from 'lucide-react'
import { AdminPageHeader, ModulePermissionCard } from '@/components/admin'
import { canAccessAdmin } from '@/lib/ui-permissions'
import NoAccessPage from '@/components/NoAccessPage'

// ================================================
// TYPES
// ================================================

interface Permission {
  id: string
  module: string
  action: string
  scope: string
}

interface RoleUser {
  id: string
  email: string
  name: string | null
  employee: {
    firstName: string
    lastName: string
  } | null
}

interface RoleDetail {
  id: string
  name: string
  displayName: string
  description?: string
  level: number
  permissions: Permission[]
  users: RoleUser[]
}

// ================================================
// CONSTANTS
// ================================================

// Canonical modules from Design Document (aligned with seed-permissions-v2.ts)
const CANONICAL_MODULES = [
  { key: 'projects', label: 'פרויקטים', enabled: true },
  { key: 'hr', label: 'כוח אדם', enabled: true },
  { key: 'events', label: 'יומן אירועים', enabled: true },
  { key: 'equipment', label: 'ציוד', enabled: true },
  { key: 'vehicles', label: 'רכבים', enabled: true },
  { key: 'vendors', label: 'דירוג ספקים', enabled: true },
  { key: 'contacts', label: 'אנשי קשר', enabled: true },
  { key: 'knowledge_repository', label: 'מאגר מידע', enabled: true },
  { key: 'agent', label: 'WDI Agent', enabled: true },
  { key: 'admin', label: 'Admin Console', enabled: true },
  { key: 'financial', label: 'פיננסי', enabled: false }, // Placeholder
]

// Role color schemes
const roleColorSchemes: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  owner: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-800',
  },
  executive: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-800',
  },
  trust_officer: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-800',
  },
  finance_officer: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    badge: 'bg-green-100 text-green-800',
  },
  domain_head: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-800',
  },
  pmo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  project_manager: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    icon: 'text-cyan-600',
    badge: 'bg-cyan-100 text-cyan-800',
  },
  project_coordinator: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: 'text-teal-600',
    badge: 'bg-teal-100 text-teal-800',
  },
  administration: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-700',
  },
  all_employees: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-600',
  },
}

// Default scope labels per role (RBAC v2 per DOC-013 §5.1)
const roleScopeLabels: Record<string, { scope: string; label: string }> = {
  owner: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  executive: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  trust_officer: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  pmo: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  finance_officer: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  domain_head: { scope: 'DOMAIN', label: 'תחום (DOMAIN)' },
  project_manager: { scope: 'ASSIGNED', label: 'פרויקטים מוקצים (ASSIGNED)' },
  project_coordinator: { scope: 'ASSIGNED', label: 'פרויקטים מוקצים (ASSIGNED)' },
  administration: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  all_employees: { scope: 'SELF', label: 'עצמי (SELF)' },
}

// Role descriptions in Hebrew (RBAC v2 per DOC-013 §4.1)
const roleDescriptions: Record<string, string> = {
  owner: 'גישה מלאה לכל המערכת ללא הגבלות',
  executive: 'גישה רחבה לניהול עסקי ותפעולי',
  trust_officer: 'ניהול משרד ומשאבי אנוש',
  pmo: 'ניהול תיק פרויקטים ארגוני',
  finance_officer: 'גישה לנתונים פיננסיים ושכר',
  domain_head: 'ניהול תחום עסקי ופרויקטים בתחום',
  project_manager: 'ניהול פרויקטים מוקצים',
  project_coordinator: 'תיאום פרויקטים ומעקב',
  administration: 'ניהול ציוד, רכבים, ספקים ואנשי קשר',
  all_employees: 'צפייה בסיסית במידע ארגוני',
}

// Module-specific notes for certain roles (RBAC v2)
const moduleNotes: Record<string, Record<string, string>> = {
  domain_head: {
    hr: 'צפייה במידע בסיסי בלבד (MAIN_PAGE)',
  },
  pmo: {
    hr: 'צפייה במידע בסיסי + כרטיס עצמי (MAIN_PAGE + SELF)',
  },
  project_manager: {
    hr: 'צפייה במידע בסיסי + כרטיס עצמי (MAIN_PAGE + SELF)',
  },
  project_coordinator: {
    hr: 'צפייה במידע בסיסי + כרטיס עצמי (MAIN_PAGE + SELF)',
  },
}

// ================================================
// COMPONENT
// ================================================

export default function AdminRoleDetailPage() {
  // Fix: use useParams() instead of use(params) for client components
  const params = useParams()
  const roleName = (params?.name as string) || ''
  const { data: session, status } = useSession()
  usePageView('admin')
  const router = useRouter()

  // State
  const [role, setRole] = useState<RoleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // RBAC v2 / Phase 6: Permission-based admin gating
  const permissions = (session?.user as any)?.permissions as string[] | undefined
  const hasAdminAccess = canAccessAdmin(permissions)

  // Redirect if not authorized
  useEffect(() => {
    if (status === 'authenticated' && !hasAdminAccess) {
      router.push('/dashboard')
    }
  }, [status, hasAdminAccess, router])

  // Fetch role
  useEffect(() => {
    if (hasAdminAccess && roleName) {
      fetchRole()
    }
  }, [hasAdminAccess, roleName])

  const fetchRole = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/roles/${roleName}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('תפקיד לא נמצא')
        } else {
          setError('שגיאה בטעינת נתוני התפקיד')
        }
        return
      }
      const data = await res.json()
      setRole(data)
    } catch (err) {
      console.error('Failed to fetch role:', err)
      setError('שגיאה בטעינת נתוני התפקיד')
    } finally {
      setLoading(false)
    }
  }

  // Get permissions for a module
  const getModulePermissions = (moduleKey: string) => {
    if (!role || !Array.isArray(role.permissions)) return []
    return role.permissions
      .filter((p) => p.module === moduleKey)
      .map((p) => ({ action: p.action, scope: p.scope }))
  }

  // Get users safely (defensive for API response structure)
  const roleUsers = role && Array.isArray(role.users) ? role.users : []

  // Get colors for role
  const colors = roleColorSchemes[roleName] || roleColorSchemes.all_employees
  const scopeInfo = roleScopeLabels[roleName] || { scope: 'SELF', label: 'עצמי' }
  const description = role?.description || roleDescriptions[roleName] || ''

  // ================================================
  // LOADING & ERROR STATES
  // ================================================

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">טוען נתוני תפקיד...</p>
        </div>
      </div>
    )
  }

  if (!hasAdminAccess) {
    return <NoAccessPage />
  }

  if (error || !role) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <AdminPageHeader
          title="פרטי תפקיד"
          description=""
          backHref="/dashboard/admin/roles"
          backLabel="חזרה לרשימת תפקידים"
        />
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">{error || 'תפקיד לא נמצא'}</h3>
        </div>
      </div>
    )
  }

  // ================================================
  // RENDER
  // ================================================

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="פרטי תפקיד"
        description=""
        backHref="/dashboard/admin/roles"
        backLabel="חזרה לרשימת תפקידים"
      />

      {/* Role Header Card */}
      <div className={`bg-white rounded-xl border ${colors.border} shadow-sm mb-6`}>
        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-xl ${colors.bg} flex items-center justify-center`}>
              <Shield className={`w-8 h-8 ${colors.icon}`} />
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{role.displayName}</h2>
              <p className="text-gray-500 mt-1">{description}</p>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-sm text-gray-500">היקף ברירת מחדל:</span>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${colors.badge}`}>
                  {scopeInfo.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">הרשאות לפי מודול</h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CANONICAL_MODULES.map((module) => (
              <ModulePermissionCard
                key={module.key}
                module={module}
                permissions={getModulePermissions(module.key)}
                note={moduleNotes[roleName]?.[module.key]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Users with this Role */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            משתמשים עם תפקיד זה ({roleUsers.length})
          </h3>
        </div>

        <div className="p-6">
          {roleUsers.length > 0 ? (
            <ul className="space-y-3">
              {roleUsers.map((user) => {
                const displayName = user.employee
                  ? `${user.employee.firstName} ${user.employee.lastName}`
                  : user.name || user.email.split('@')[0]

                return (
                  <li key={user.id}>
                    <Link
                      href={`/dashboard/admin/users/${user.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{displayName}</p>
                        <p className="text-sm text-gray-500" dir="ltr">
                          {user.email}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500">אין משתמשים עם תפקיד זה</p>
              <Link
                href="/dashboard/admin/users"
                className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                עבור לניהול משתמשים להקצאת תפקיד
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
