// ================================================
// WDI ERP - HR [id] API Route
// Version: 20260127
// RBAC v2: Use permission system from DOC-013/DOC-014
// SECURITY: Sensitive data filtering based on roles
// ================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { requirePermission, hasRole } from '@/lib/permissions'

// Roles that can read sensitive HR data (DOC-014 §4.2)
const HR_SENSITIVE_READ_ROLES = ['owner', 'executive', 'trust_officer']

// Finance Officer can see compensation fields only (DOC-014 §4.2)
const HR_COMPENSATION_READ_ROLES = ['finance_officer']


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    // RBAC v2: Check read permission
    const denied = await requirePermission(session, 'hr', 'read', { id, employeeId: id })
    if (denied) return denied

    // Get user roles for sensitivity filtering
    const userId = (session!.user as any)?.id
    const userRoles = (session!.user as any)?.roles || []
    const userRoleNames: string[] = userRoles.map((r: { name: string }) => r.name)

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        ledProjects: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            state: true,
          },
        },
        managedProjects: {
          select: {
            project: {
              select: {
                id: true,
                projectNumber: true,
                name: true,
                state: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            roles: {
              select: {
                role: {
                  select: { displayName: true },
                },
              },
            },
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 })
    }

    // Build response without sensitive fields by default
    const { idNumber, grossSalary, ...safeEmployee } = employee

    const response: any = {
      ...safeEmployee,
      children: employee.children ? JSON.parse(employee.children) : [],
      education: employee.education ? JSON.parse(employee.education) : [],
      certifications: employee.certifications ? JSON.parse(employee.certifications) : [],
    }

    // RBAC v1: Only include sensitive data for authorized roles (DOC-014 §4.2)
    const canReadSensitive = userRoleNames.some(r => HR_SENSITIVE_READ_ROLES.includes(r))
    const canReadCompensation = userRoleNames.some(r => HR_COMPENSATION_READ_ROLES.includes(r))

    if (canReadSensitive) {
      response.idNumber = idNumber
      response.grossSalary = grossSalary
    } else if (canReadCompensation) {
      // Finance Officer: compensation fields only per DOC-013 §7.3.4
      response.grossSalary = grossSalary
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 })
  }
}

// פונקציה להשוואת שני אובייקטים ומציאת שינויים
function findChanges(oldObj: any, newObj: any): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {}
  
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
  
  for (const key of Array.from(allKeys)) {
    // דילוג על שדות מערכת
    if (['id', 'createdAt', 'updatedAt', 'children', 'education', 'certifications'].includes(key)) continue
    
    const oldVal = oldObj[key]
    const newVal = newObj[key]
    
    // השוואה - מתחשב ב-null/undefined/empty string
    const oldNorm = oldVal === '' ? null : oldVal
    const newNorm = newVal === '' ? null : newVal
    
    // השוואת תאריכים
    if (oldNorm instanceof Date && newNorm instanceof Date) {
      if (oldNorm.getTime() !== newNorm.getTime()) {
        changes[key] = { from: oldNorm.toISOString(), to: newNorm.toISOString() }
      }
    } else if (oldNorm !== newNorm) {
      changes[key] = { from: oldNorm, to: newNorm }
    }
  }
  
  return changes
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    // RBAC v2: Check update permission
    const denied = await requirePermission(session, 'hr', 'update', { id, employeeId: id })
    if (denied) return denied
    const data = await request.json()

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    })

    if (!existingEmployee) {
      return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 })
    }

    if (data.idNumber !== existingEmployee.idNumber) {
      const duplicateIdNumber = await prisma.employee.findFirst({
        where: {
          idNumber: data.idNumber,
          id: { not: id },
        },
      })

      if (duplicateIdNumber) {
        return NextResponse.json({ error: 'תעודת זהות זו משויכת לעובד אחר' }, { status: 409 })
      }
    }

    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      idNumber: data.idNumber,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      phone: data.phone || null,
      email: data.email || null,
      personalEmail: data.personalEmail || null,
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
      certifications: data.certifications ? JSON.stringify(data.certifications) : null,
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
    }

    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl
    if (data.idCardFileUrl !== undefined) updateData.idCardFileUrl = data.idCardFileUrl
    if (data.idCardSpouseFileUrl !== undefined) updateData.idCardSpouseFileUrl = data.idCardSpouseFileUrl
    if (data.driversLicenseFileUrl !== undefined) updateData.driversLicenseFileUrl = data.driversLicenseFileUrl
    if (data.contractFileUrl !== undefined) updateData.contractFileUrl = data.contractFileUrl

    // זיהוי שינויים - השוואה דינמית
    const changes = findChanges(existingEmployee, updateData)

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
    })

    // תיעוד רק אם יש שינויים
    if (Object.keys(changes).length > 0) {
      await logCrud('UPDATE', 'hr', 'employee', id, `${data.firstName} ${data.lastName}`, { changes })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    // RBAC v2: Check delete permission
    const denied = await requirePermission(session, 'hr', 'delete', { id, employeeId: id })
    if (denied) return denied

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!existingEmployee) {
      return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 })
    }

    const employeeName = `${existingEmployee.firstName} ${existingEmployee.lastName}`

    await prisma.$transaction(async (tx) => {
      if (existingEmployee.user) {
        await tx.user.delete({
          where: { id: existingEmployee.user.id },
        })
      }

      await tx.employee.delete({
        where: { id },
      })
    })

    await logCrud('DELETE', 'hr', 'employee', id, employeeName, {
      idNumber: existingEmployee.idNumber,
      hadLinkedUser: !!existingEmployee.user
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
