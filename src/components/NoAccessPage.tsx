// ================================================
// WDI ERP - No Access Page Component
// Version: 20260202-RBAC-V2-PHASE6
// Generic "no access" UX - Hebrew copy, no data leaks
// DOC-016: Does not reveal which permission is missing
// ================================================

import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

/**
 * Generic "no access" page for unauthorized users.
 * Does NOT reveal which specific permission is missing (no leaks).
 */
export function NoAccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <ShieldOff className="w-16 h-16 text-gray-300 mb-4" />
      <h2 className="text-xl font-semibold text-gray-700 mb-2">אין גישה</h2>
      <p className="text-gray-500 mb-6">אין לך הרשאה לצפות בדף זה.</p>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        חזרה לדשבורד
      </Link>
    </div>
  )
}

export default NoAccessPage
