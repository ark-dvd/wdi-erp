// ================================================
// WDI ERP - Role Card Component
// Version: 20260125-MAYBACH
// Card-based role display for Admin Console
// ================================================

'use client'

import Link from 'next/link'
import { ChevronLeft, Users, Shield } from 'lucide-react'

interface RoleCardProps {
  role: {
    id: string
    name: string
    displayName: string
    description?: string
    level: number
    userCount: number
  }
}

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
  senior_pm: {
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
  operations_staff: {
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

// Default scope per role (based on DOC-013)
const roleScopeLabels: Record<string, { scope: string; label: string }> = {
  owner: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  executive: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  trust_officer: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  finance_officer: { scope: 'ALL', label: 'גישה מלאה (ALL)' },
  domain_head: { scope: 'DOMAIN', label: 'תחום (DOMAIN)' },
  senior_pm: { scope: 'PROJECT', label: 'פרויקט (PROJECT)' },
  project_coordinator: { scope: 'PROJECT', label: 'פרויקט (PROJECT)' },
  operations_staff: { scope: 'OWN', label: 'בעלות (OWN)' },
  all_employees: { scope: 'SELF', label: 'עצמי (SELF)' },
}

// Role descriptions in Hebrew
const roleDescriptions: Record<string, string> = {
  owner: 'גישה מלאה לכל המערכת ללא הגבלות',
  executive: 'גישה רחבה לניהול עסקי ותפעולי',
  trust_officer: 'ניהול הרשאות משתמשים והגדרות מערכת',
  finance_officer: 'גישה לנתונים פיננסיים ושכר',
  domain_head: 'ניהול תחום עסקי ופרויקטים בתחום',
  senior_pm: 'ניהול פרויקטים והקצאת משאבים',
  project_coordinator: 'תיאום פרויקטים ומעקב',
  operations_staff: 'תפעול שוטף ותיעוד',
  all_employees: 'צפייה בסיסית במידע ארגוני',
}

export function RoleCard({ role }: RoleCardProps) {
  const colors = roleColorSchemes[role.name] || roleColorSchemes.all_employees
  const scopeInfo = roleScopeLabels[role.name] || { scope: 'SELF', label: 'עצמי' }
  const description = role.description || roleDescriptions[role.name] || ''

  return (
    <div
      className={`bg-white rounded-xl border ${colors.border} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Shield className={`w-6 h-6 ${colors.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">{role.displayName}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3">
          {/* Scope */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">היקף:</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${colors.badge}`}>
              {scopeInfo.label}
            </span>
          </div>

          {/* User Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">משתמשים:</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Users className="w-4 h-4 text-gray-400" />
              {role.userCount}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Link
        href={`/dashboard/admin/roles/${role.name}`}
        className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <span>צפייה בפרטים</span>
        <ChevronLeft className="w-4 h-4" />
      </Link>
    </div>
  )
}
