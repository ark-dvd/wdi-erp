// ================================================
// WDI ERP - User Access Badge Component
// Version: 20260125-MAYBACH
// Displays user access level in Hebrew
// ================================================

'use client'

interface UserAccessBadgeProps {
  accessLevel: 'full' | 'domain' | 'project' | 'limited' | 'none'
}

const ACCESS_LEVELS = {
  full: {
    label: 'גישה מלאה',
    icon: '🟢',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  domain: {
    label: 'גישה לתחום',
    icon: '🔵',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  project: {
    label: 'גישה לפרויקטים',
    icon: '🔵',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  limited: {
    label: 'גישה מוגבלת',
    icon: '⚪',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  none: {
    label: 'ללא גישה',
    icon: '⚫',
    className: 'bg-slate-100 text-slate-500 border-slate-200',
  },
}

export function UserAccessBadge({ accessLevel }: UserAccessBadgeProps) {
  const config = ACCESS_LEVELS[accessLevel]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${config.className}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

// Helper function to determine access level from roles
export function getAccessLevel(
  roles: { name: string; level?: number }[]
): 'full' | 'domain' | 'project' | 'limited' | 'none' {
  if (!roles || roles.length === 0) {
    return 'none'
  }

  const roleNames = roles.map((r) => r.name)

  // Full access roles (ALL scope)
  if (
    roleNames.includes('owner') ||
    roleNames.includes('executive') ||
    roleNames.includes('trust_officer') ||
    roleNames.includes('finance_officer')
  ) {
    return 'full'
  }

  // Domain scope roles
  if (roleNames.includes('domain_head')) {
    return 'domain'
  }

  // Project scope roles (RBAC v2)
  if (roleNames.includes('project_manager') || roleNames.includes('project_coordinator')) {
    return 'project'
  }

  // Limited access (administration, all_employees) - RBAC v2
  if (roleNames.includes('administration') || roleNames.includes('all_employees')) {
    return 'limited'
  }

  return 'none'
}
