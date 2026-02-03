// ================================================
// WDI ERP - Admin Users Management Page
// Version: 20260202-RBAC-V2-PHASE6
// RBAC v2: Permission-based admin gating (DOC-016 §6.1, FP-002)
// ================================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { usePageView } from '@/hooks/useActivityLog'
import { Search, Filter, Users, Loader2 } from 'lucide-react'
import { AdminPageHeader, UserCard } from '@/components/admin'
import { canAccessAdmin } from '@/lib/ui-permissions'
import NoAccessPage from '@/components/NoAccessPage'

// ================================================
// TYPES
// ================================================

interface Role {
  id: string
  name: string
  displayName: string
  level: number
  userCount?: number
}

interface User {
  id: string
  email: string
  name: string | null
  lastLogin: string | null
  isActive: boolean
  roles: Role[]
  employee: {
    firstName: string
    lastName: string
    role: string
    photoUrl?: string | null
  } | null
}

// ================================================
// COMPONENT
// ================================================

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  usePageView('admin')
  const router = useRouter()

  // State
  const [users, setUsers] = useState<User[]>([])
  const [usersTotal, setUsersTotal] = useState<number>(0)
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')

  // RBAC v2 / Phase 6: Permission-based admin gating
  const permissions = (session?.user as any)?.permissions as string[] | undefined
  const hasAdminAccess = canAccessAdmin(permissions)

  // Redirect if not authorized
  useEffect(() => {
    if (status === 'authenticated' && !hasAdminAccess) {
      router.push('/dashboard')
    }
  }, [status, hasAdminAccess, router])

  // Fetch data
  useEffect(() => {
    if (hasAdminAccess) {
      fetchUsers()
      fetchRoles()
    }
  }, [hasAdminAccess])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        const items = data.items || data
        setUsers(items)
        // PAGINATION FIX: Store API total for display
        setUsersTotal(data.pagination?.total ?? (Array.isArray(items) ? items.length : 0))
      }
    } catch (err) {
      console.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        setAllRoles(data.roles || [])
      }
    } catch (err) {
      console.error('Failed to fetch roles')
    }
  }

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const searchLower = search.toLowerCase()
      const matchesSearch =
        !search ||
        user.email.toLowerCase().includes(searchLower) ||
        user.name?.toLowerCase().includes(searchLower) ||
        user.employee?.firstName.toLowerCase().includes(searchLower) ||
        user.employee?.lastName.toLowerCase().includes(searchLower)

      // Role filter
      const matchesRole =
        selectedRoleFilter === 'all' ||
        user.roles.some((r) => r.name === selectedRoleFilter)

      return matchesSearch && matchesRole
    })
  }, [users, search, selectedRoleFilter])

  // Stats
  const activeUsersCount = users.filter((u) => u.isActive).length
  const rolesInUseCount = new Set(users.flatMap((u) => u.roles.map((r) => r.name))).size

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  // Unauthorized state
  if (!hasAdminAccess) {
    return <NoAccessPage />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="ניהול משתמשים"
        description="ניהול גישה והרשאות משתמשי המערכת"
        backHref="/dashboard/admin"
        backLabel="חזרה לניהול מערכת"
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-3xl font-bold text-gray-900">{usersTotal.toLocaleString('he-IL')}</div>
          <div className="text-sm text-gray-500">משתמשים במערכת</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-3xl font-bold text-emerald-600">{activeUsersCount}</div>
          <div className="text-sm text-gray-500">משתמשים פעילים</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-3xl font-bold text-blue-600">{rolesInUseCount}</div>
          <div className="text-sm text-gray-500">תפקידים בשימוש</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש משתמש..."
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Role Filter */}
          <div className="relative min-w-[200px]">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer transition-all"
            >
              <option value="all">כל התפקידים</option>
              {allRoles
                .filter((r) => r.name !== 'all_employees')
                .map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.displayName}
                  </option>
                ))}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active filters indicator */}
        {(search || selectedRoleFilter !== 'all') && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-gray-500">מציג {filteredUsers.length.toLocaleString('he-IL')} מתוך {usersTotal.toLocaleString('he-IL')} משתמשים</span>
            {(search || selectedRoleFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('')
                  setSelectedRoleFilter('all')
                }}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                נקה סינון
              </button>
            )}
          </div>
        )}
      </div>

      {/* Users Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">לא נמצאו משתמשים</h3>
          <p className="text-gray-500 text-sm">
            {search || selectedRoleFilter !== 'all'
              ? 'נסה לשנות את הסינון או החיפוש'
              : 'אין משתמשים במערכת'}
          </p>
        </div>
      )}
    </div>
  )
}
