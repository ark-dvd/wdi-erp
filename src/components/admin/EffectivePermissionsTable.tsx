// ================================================
// WDI ERP - Effective Permissions Table Component
// Version: 20260125-MAYBACH
// Display-only permissions matrix per Design Document
// ================================================

'use client'

import { Check, X, Pause } from 'lucide-react'

// ================================================
// TYPES
// ================================================

interface Permission {
  module: string
  action: string
  scope: string
}

interface EffectivePermissionsTableProps {
  permissions: Permission[]
}

// ================================================
// CONSTANTS - Canonical Modules (Design Document)
// ================================================

const CANONICAL_MODULES = [
  { key: 'projects', label: 'פרויקטים', enabled: true },
  { key: 'hr', label: 'כוח אדם', enabled: true },
  { key: 'events', label: 'יומן אירועים', enabled: true },
  { key: 'equipment', label: 'ציוד', enabled: true },
  { key: 'vehicles', label: 'רכבים', enabled: true },
  { key: 'vendors', label: 'דירוג ספקים', enabled: true },
  { key: 'org_directory', label: 'אנשי קשר', enabled: true },
  { key: 'knowledge_repository', label: 'מאגר מידע', enabled: true },
  { key: 'agent', label: 'WDI Agent', enabled: true },
  { key: 'admin', label: 'Admin Console', enabled: true },
  { key: 'finance', label: 'פיננסי', enabled: false }, // Placeholder - disabled
]

const OPERATIONS = [
  { key: 'READ', label: 'צפייה' },
  { key: 'CREATE', label: 'יצירה' },
  { key: 'UPDATE', label: 'עריכה' },
  { key: 'DELETE', label: 'מחיקה' },
]

const SCOPE_LABELS: Record<string, string> = {
  ALL: 'הכל',
  DOMAIN: 'בתחום',
  PROJECT: 'בפרויקט',
  OWN: 'שלי',
  SELF: 'עצמי',
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function getPermissionForModule(
  permissions: Permission[],
  moduleKey: string,
  operation: string
): { hasPermission: boolean; scope?: string } {
  const permission = permissions.find(
    (p) => p.module === moduleKey && p.action === operation
  )

  if (permission) {
    return { hasPermission: true, scope: permission.scope }
  }

  return { hasPermission: false }
}

// ================================================
// COMPONENT
// ================================================

export function EffectivePermissionsTable({ permissions }: EffectivePermissionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700 bg-gray-50 rounded-tr-lg">
              מודול
            </th>
            {OPERATIONS.map((op) => (
              <th
                key={op.key}
                className="py-3 px-4 text-center text-sm font-semibold text-gray-700 bg-gray-50"
              >
                {op.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {CANONICAL_MODULES.map((module, index) => {
            const isLast = index === CANONICAL_MODULES.length - 1

            // Disabled module (Finance placeholder)
            if (!module.enabled) {
              return (
                <tr key={module.key} className="bg-gray-50/50">
                  <td className={`py-3 px-4 ${isLast ? 'rounded-br-lg' : ''}`}>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Pause className="w-4 h-4" />
                      <span>{module.label}</span>
                    </div>
                  </td>
                  <td colSpan={4} className="py-3 px-4 text-center">
                    <span className="text-sm text-gray-400 flex items-center justify-center gap-1">
                      <Pause className="w-3 h-3" />
                      בפיתוח
                    </span>
                  </td>
                </tr>
              )
            }

            return (
              <tr key={module.key} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4">
                  <span className="font-medium text-gray-900">{module.label}</span>
                </td>
                {OPERATIONS.map((op) => {
                  const { hasPermission, scope } = getPermissionForModule(
                    permissions,
                    module.key,
                    op.key
                  )

                  // Special case: Agent doesn't have UPDATE/DELETE
                  if (module.key === 'agent' && (op.key === 'UPDATE' || op.key === 'DELETE')) {
                    return (
                      <td key={op.key} className="py-3 px-4 text-center">
                        <span className="text-gray-300">—</span>
                      </td>
                    )
                  }

                  return (
                    <td key={op.key} className="py-3 px-4 text-center">
                      {hasPermission ? (
                        <div className="flex items-center justify-center gap-1">
                          <Check className="w-4 h-4 text-emerald-600" />
                          {scope && (
                            <span className="text-xs text-emerald-700 font-medium">
                              {SCOPE_LABELS[scope] || scope}
                            </span>
                          )}
                        </div>
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
