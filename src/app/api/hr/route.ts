// ================================================
// WDI ERP - HR API Route
// Version: 20260111-211000
// Added: updatedAt, updatedBy for list view
// Security: Removed idNumber from GET response (PII)
// ================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employees = await prisma.employee.findMany({
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        // idNumber: removed from response for security (PII)
        role: true,
        department: true,
        phone: true,
        email: true,
        status: true,
        photoUrl: true,
        birthDate: true,
        startDate: true,
        updatedAt: true,
        // Note: Employee model doesn't have updatedBy field in schema
        managedProjects: {
          select: {
            project: {
              select: {
                id: true,
                name: true,
                projectNumber: true,
                state: true,
              }
            }
          },
          where: {
            project: {
              state: 'פעיל'
            }
          }
        },
        ledProjects: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            state: true,
          },
          where: {
            state: 'פעיל'
          }
        },
      },
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const normalizedEmail = data.email?.toLowerCase() || null

    const existingEmployee = await prisma.employee.findUnique({
      where: { idNumber: data.idNumber },
    })

    if (existingEmployee) {
      return NextResponse.json({ error: 'עובד עם תעודת זהות זו כבר קיים במערכת' }, { status: 400 })
    }

    // Stage 2: User must exist before Employee creation
    if (normalizedEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })
      if (!existingUser) {
        return NextResponse.json({ error: 'משתמש לא קיים במערכת. יש ליצור משתמש לפני יצירת עובד' }, { status: 400 })
      }
    }

    const employee = await prisma.employee.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        idNumber: data.idNumber,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        phone: data.phone || null,
        email: normalizedEmail,
        personalEmail: data.personalEmail || null, // #8: אימייל אישי
        address: data.address || null,
        linkedinUrl: data.linkedinUrl || null,
        spouseFirstName: data.spouseFirstName || null,
        spouseLastName: data.spouseLastName || null,
        spouseIdNumber: data.spouseIdNumber || null,
        spouseBirthDate: data.spouseBirthDate ? new Date(data.spouseBirthDate) : null,
        spousePhone: data.spousePhone || null,
        spouseEmail: data.spouseEmail || null,
        marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
        children: data.children ? JSON.stringify(data.children) : null,
        education: data.education ? JSON.stringify(data.education) : null,
        certifications: data.certifications ? JSON.stringify(data.certifications) : null, // #10: הכשרות
        role: data.role,
        department: data.department || null,
        employmentType: data.employmentType || 'אורגני',
        employeeCategory: data.employeeCategory || null,
        employmentPercent: data.employmentPercent || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        grossSalary: data.grossSalary || null,
        status: data.status || 'פעיל',
        securityClearance: data.securityClearance || null,
        photoUrl: data.photoUrl || null,
        idCardFileUrl: data.idCardFileUrl || null,
        idCardSpouseFileUrl: data.idCardSpouseFileUrl || null,
        driversLicenseFileUrl: data.driversLicenseFileUrl || null,
        contractFileUrl: data.contractFileUrl || null,
        // Note: Employee model doesn't have updatedById in schema
      },
    })

    // תיעוד הפעולה
    await logCrud('CREATE', 'hr', 'employee', employee.id, `${data.firstName} ${data.lastName}`, {
      role: data.role,
      department: data.department
    })

    // Link to existing User (Stage 2: pre-existence verified above)
    if (normalizedEmail) {
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: { employeeId: employee.id },
      })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
