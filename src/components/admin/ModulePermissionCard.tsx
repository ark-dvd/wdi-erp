// ================================================
// WDI ERP - Module Permission Card Component
// Version: 20260125-MAYBACH
// Display permissions for a single module
// ================================================

'use client'

import { Check, X, Pause, AlertTriangle } from 'lucide-react'

interface Permission {
  action: string
  scope: string
}

interface ModulePermissionCardProps {
  module: {
    key: string
    label: string
    enabled: boolean
  }
  permissions: Permission[]
  note?: string
}

const OPERATIONS = [
  { key: 'read', label: 'צפייה' },
  { key: 'create', label: 'יצירה' },
  { key: 'update', label: 'עריכה' },
  { key: 'delete', label: 'מחיקה' },
]

const SCOPE_LABELS: Record<string, string> = {
  ALL: 'הכל',
  DOMAIN: 'בתחום',
  PROJECT: 'בפרויקט',
  OWN: 'שלי',
  SELF: 'עצמי',
}

export function ModulePermissionCard({ module, permissions, note }: ModulePermissionCardProps) {
  // Disabled module (Finance placeholder)
  if (!module.enabled) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-400 mb-3">
          <Pause className="w-5 h-5" />
          <span className="font-medium">{module.label}</span>
        </div>
        <div className="text-sm text-gray-400 flex items-center gap-1">
          <Pause className="w-4 h-4" />
          מודול בפיתוח – לא פעיל
        </div>
      </div>
    )
  }

  const getPermission = (action: string, moduleKey: string): Permission | undefined => {
    // Case-insensitive match - DB stores UPPERCASE, UI uses lowercase
    const found = permissions.find((p) => p.action.toLowerCase() === action.toLowerCase())

    // Special case: Agent module uses QUERY action for "read" capability
    if (!found && action.toLowerCase() === 'read' && moduleKey === 'agent') {
      return permissions.find((p) => p.action.toLowerCase() === 'query')
    }

    return found
  }

  const hasAnyPermission = permissions.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h4 className="font-semibold text-gray-900 mb-4">{module.label}</h4>

      <div className="grid grid-cols-2 gap-3">
        {OPERATIONS.map((op) => {
          const permission = getPermission(op.key, module.key)

          // Special case: Agent doesn't have update/delete
          if (module.key === 'agent' && (op.key === 'update' || op.key === 'delete')) {
            return (
              <div key={op.key} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{op.label}</span>
                <span className="text-gray-300">—</span>
              </div>
            )
          }

          return (
            <div key={op.key} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{op.label}</span>
              {permission ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <Check className="w-4 h-4" />
                  {SCOPE_LABELS[permission.scope] || permission.scope}
                </span>
              ) : (
                <X className="w-4 h-4 text-gray-300" />
              )}
            </div>
          )
        })}
      </div>

      {/* Note or No Access Warning */}
      {note && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-blue-600 flex items-start gap-1">
          <span className="flex-shrink-0">ℹ️</span>
          <span>{note}</span>
        </div>
      )}

      {!hasAnyPermission && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>אין גישה למודול זה</span>
        </div>
      )}
    </div>
  )
}
