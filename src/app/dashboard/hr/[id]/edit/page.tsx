// ================================================
// WDI ERP - Edit Employee Page
// Version: 20251211-143300
// Fixes: #5 return to main screen, #8 email fields, #10 certifications
// ================================================

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ArrowRight } from 'lucide-react'
import EmployeeForm from '@/components/EmployeeForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params

  const employee = await prisma.employee.findUnique({
    where: { id },
  })

  if (!employee) {
    notFound()
  }

  // המרת נתונים לפורמט הטופס
  const formatDateForInput = (date: Date | null) => {
    if (!date) return ''
    return new Date(date).toISOString().split('T')[0]
  }

  const initialData = {
    firstName: employee.firstName,
    lastName: employee.lastName,
    idNumber: employee.idNumber,
    birthDate: formatDateForInput(employee.birthDate),
    phone: employee.phone || '',
    email: employee.email || '',
    personalEmail: (employee as any).personalEmail || '', // #8: אימייל אישי
    address: employee.address || '',
    linkedinUrl: employee.linkedinUrl || '',
    spouseFirstName: employee.spouseFirstName || '',
    spouseLastName: employee.spouseLastName || '',
    spouseIdNumber: employee.spouseIdNumber || '',
    spouseBirthDate: formatDateForInput(employee.spouseBirthDate),
    spousePhone: employee.spousePhone || '',
    spouseEmail: employee.spouseEmail || '',
    marriageDate: formatDateForInput(employee.marriageDate),
    children: employee.children ? JSON.parse(employee.children) : [],
    education: employee.education ? JSON.parse(employee.education) : [],
    certifications: (employee as any).certifications ? JSON.parse((employee as any).certifications) : [], // #10
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
        {/* #5: חזרה למסך הראשי */}
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

      <EmployeeForm initialData={initialData} isEdit employeeId={id} />
    </div>
  )
}