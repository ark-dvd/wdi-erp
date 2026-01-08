// ================================================
// WDI ERP - New Employee Page
// Version: 20251211-143600
// Fixes: #5 return to main screen
// ================================================

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import EmployeeForm from '@/components/EmployeeForm'

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {/* #5: חזרה למסך הראשי */}
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

      <EmployeeForm />
    </div>
  )
}