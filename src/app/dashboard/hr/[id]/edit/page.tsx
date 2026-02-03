'use client'

// ================================================
// WDI ERP - Edit Employee Page
// Version: 20260202-RBAC-V2-PHASE6
// RBAC v2: Scope-based access control (DOC-016 §6.1, FP-002)
// Fixes: #5 return to main screen, #8 email fields, #10 certifications
// ================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, ShieldOff } from 'lucide-react'
import EmployeeForm from '@/components/EmployeeForm'
import { getHRScope } from '@/lib/ui-permissions'

export default function EditEmployeePage() {
  const params = useParams()
  const id = params?.id as string
  const { data: session, status: sessionStatus } = useSession()
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // RBAC v2 / Phase 6: HR scope-based access control
  const permissions = (session?.user as any)?.permissions as string[] | undefined
  const hrScope = getHRScope(permissions)
  const currentUserEmployeeId = (session?.user as any)?.employeeId

  // Access rules for editing:
  // - ALL: can edit any employee
  // - SELF: can edit only own record
  // - MAIN_PAGE or null: no edit access
  const canEdit = hrScope === 'ALL' || (hrScope === 'SELF' && currentUserEmployeeId === id)
  const showSensitiveHR = hrScope === 'ALL' || hrScope === 'SELF'

  useEffect(() => {
    if (id && canEdit) {
      fetchEmployee()
    } else if (sessionStatus === 'authenticated' && !canEdit) {
      setLoading(false)
    }
  }, [id, canEdit, sessionStatus])

  const fetchEmployee = async () => {
    try {
      const res = await fetch(`/api/hr/${id}`)
      if (res.ok) {
        const data = await res.json()
        setEmployee(data)
      }
    } catch (error) {
      console.error('Error fetching employee:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format date for input
  const formatDateForInput = (date: string | null) => {
    if (!date) return ''
    return new Date(date).toISOString().split('T')[0]
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // RBAC v2 / Phase 6: Access denied for MAIN_PAGE users or SELF editing others
  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ShieldOff className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">אין גישה</h2>
        <p className="text-gray-500 mb-6">אין לך הרשאה לערוך עובד זה.</p>
        <Link
          href="/dashboard/hr"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          חזרה לרשימת עובדים
        </Link>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">העובד לא נמצא</p>
        <Link href="/dashboard/hr" className="text-blue-600 hover:underline mt-2 inline-block">
          חזרה לרשימה
        </Link>
      </div>
    )
  }

  // Convert data to form format
  const initialData = {
    firstName: employee.firstName,
    lastName: employee.lastName,
    idNumber: employee.idNumber,
    birthDate: formatDateForInput(employee.birthDate),
    phone: employee.phone || '',
    email: employee.email || '',
    personalEmail: employee.personalEmail || '',
    address: employee.address || '',
    linkedinUrl: employee.linkedinUrl || '',
    spouseFirstName: employee.spouseFirstName || '',
    spouseLastName: employee.spouseLastName || '',
    spouseIdNumber: employee.spouseIdNumber || '',
    spouseBirthDate: formatDateForInput(employee.spouseBirthDate),
    spousePhone: employee.spousePhone || '',
    spouseEmail: employee.spouseEmail || '',
    marriageDate: formatDateForInput(employee.marriageDate),
    children: employee.children ? (typeof employee.children === 'string' ? JSON.parse(employee.children) : employee.children) : [],
    education: employee.education ? (typeof employee.education === 'string' ? JSON.parse(employee.education) : employee.education) : [],
    certifications: employee.certifications ? (typeof employee.certifications === 'string' ? JSON.parse(employee.certifications) : employee.certifications) : [],
    role: employee.role,
    department: employee.department || '',
    employmentType: employee.employmentType,
    employeeCategory: employee.employeeCategory || '',
    employmentPercent: employee.employmentPercent?.toString() || '',
    startDate: formatDateForInput(employee.startDate),
    endDate: formatDateForInput(employee.endDate),
    grossSalary: employee.grossSalary?.toString() || '',
    status: employee.status,
    securityClearance: employee.securityClearance?.toString() || '',
    photoUrl: employee.photoUrl || '',
    idCardFileUrl: employee.idCardFileUrl || '',
    idCardSpouseFileUrl: employee.idCardSpouseFileUrl || '',
    driversLicenseFileUrl: employee.driversLicenseFileUrl || '',
    contractFileUrl: employee.contractFileUrl || '',
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
          <h1 className="text-2xl font-bold text-gray-800">
            עריכת {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-gray-500">עדכון פרטי העובד</p>
        </div>
      </div>

      <EmployeeForm
        initialData={initialData}
        isEdit
        employeeId={id}
        showSensitiveHR={showSensitiveHR}
      />
    </div>
  )
}
