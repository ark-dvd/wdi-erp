// ================================================
// WDI ERP - User Card Component
// Version: 20260125-MAYBACH
// Card-based user display for Admin Console
// ================================================

'use client'

import Link from 'next/link'
import { ChevronLeft, User as UserIcon } from 'lucide-react'
import { UserAccessBadge, getAccessLevel } from './UserAccessBadge'

interface Role {
  id: string
  name: string
  displayName: string
  level?: number
}

interface UserCardProps {
  user: {
    id: string
    email: string
    name: string | null
    isActive: boolean
    lastLogin: string | null
    roles: Role[]
    employee: {
      firstName: string
      lastName: string
      role: string
      photoUrl?: string | null
    } | null
  }
}

// RBAC v1 canonical role colors
const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  executive: 'bg-red-100 text-red-800',
  trust_officer: 'bg-blue-100 text-blue-800',
  pmo: 'bg-indigo-100 text-indigo-800',
  finance_officer: 'bg-green-100 text-green-800',
  domain_head: 'bg-orange-100 text-orange-800',
  project_manager: 'bg-cyan-100 text-cyan-800',
  project_coordinator: 'bg-teal-100 text-teal-800',
  administration: 'bg-gray-100 text-gray-700',
  all_employees: 'bg-slate-100 text-slate-600',
}

function formatLastLogin(dateStr: string | null): string {
  if (!dateStr) return 'טרם התחבר'

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) {
    return 'לפני פחות משעה'
  } else if (diffHours < 24) {
    return `היום ${date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jerusalem',
    })}`
  } else if (diffDays === 1) {
    return 'אתמול'
  } else if (diffDays < 7) {
    return `לפני ${diffDays} ימים`
  } else {
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Jerusalem',
    })
  }
}

export function UserCard({ user }: UserCardProps) {
  const displayName = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user.name || user.email.split('@')[0]

  const accessLevel = getAccessLevel(user.roles)
  const primaryRoles = user.roles.filter((r) => r.name !== 'all_employees').slice(0, 2)
  const hasMoreRoles = user.roles.filter((r) => r.name !== 'all_employees').length > 2

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 ${
        !user.isActive ? 'opacity-60' : ''
      }`}
    >
      <div className="p-5">
        {/* Header: Avatar + Name */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.employee?.photoUrl ? (
              <img
                src={user.employee.photoUrl}
                alt={displayName}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <UserIcon className="w-7 h-7 text-gray-400" />
              </div>
            )}
          </div>

          {/* Name + Email */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{displayName}</h3>
            <p className="text-sm text-gray-500 truncate" dir="ltr">
              {user.email}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-gray-100" />

        {/* Roles */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">תפקידים:</p>
          <div className="flex flex-wrap gap-1.5">
            {primaryRoles.length > 0 ? (
              <>
                {primaryRoles.map((role) => (
                  <span
                    key={role.id}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      roleColors[role.name] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {role.displayName}
                  </span>
                ))}
                {hasMoreRoles && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500">
                    +{user.roles.filter((r) => r.name !== 'all_employees').length - 2}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">ללא תפקיד מיוחד</span>
            )}
          </div>
        </div>

        {/* Access Badge */}
        <div className="mb-4">
          <UserAccessBadge accessLevel={accessLevel} />
        </div>

        {/* Status + Last Login */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">סטטוס:</span>
            {user.isActive ? (
              <span className="text-emerald-600 font-medium">פעיל</span>
            ) : (
              <span className="text-red-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                מושבת
              </span>
            )}
          </div>
          <div className="text-gray-400 text-xs">
            התחברות אחרונה: {formatLastLogin(user.lastLogin)}
          </div>
        </div>
      </div>

      {/* Footer: View Details */}
      <Link
        href={`/dashboard/admin/users/${user.id}`}
        className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <span>צפייה בפרטים</span>
        <ChevronLeft className="w-4 h-4" />
      </Link>
    </div>
  )
}
