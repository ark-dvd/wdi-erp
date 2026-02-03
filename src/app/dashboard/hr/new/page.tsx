'use client'

// ================================================
// WDI ERP - New Employee Page
// Version: 20260202-RBAC-V2-PHASE6
// RBAC v2: Scope-based access control (DOC-016 §6.1, FP-002)
// Fixes: #5 return to main screen
// ================================================

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, ShieldOff } from 'lucide-react'
import EmployeeForm from '@/components/EmployeeForm'
import { getHRScope } from '@/lib/ui-permissions'

export default function NewEmployeePage() {
  const { data: session, status: sessionStatus } = useSession()

  // RBAC v2 / Phase 6: HR scope-based access control
  const permissions = (session?.user as any)?.permissions as string[] | undefined
  const hrScope = getHRScope(permissions)

  // Access rules for creating new employees:
  // - ALL: can create employees
  // - SELF, MAIN_PAGE, or null: no create access
  const canCreate = hrScope === 'ALL'
  const showSensitiveHR = hrScope === 'ALL' || hrScope === 'SELF'

  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // RBAC v2 / Phase 6: Access denied for non-ALL users
  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ShieldOff className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">אין גישה</h2>
        <p className="text-gray-500 mb-6">אין לך הרשאה להוסיף עובדים חדשים.</p>
        <Link
          href="/dashboard/hr"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          חזרה לרשימת עובדים
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/hr"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRight size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">הוספת עובד חדש</h1>
          <p className="text-gray-500">מילוי פרטי העובד</p>
        </div>
      </div>

      <EmployeeForm showSensitiveHR={showSensitiveHR} />
    </div>
  )
}
