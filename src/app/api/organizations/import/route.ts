// src/app/api/organizations/import/route.ts
// Version: 20260124
// Added: logCrud for bulk import
// SECURITY: Added role-based authorization for bulk import

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

// Elevated roles for bulk import operations
const ORGS_IMPORT_ROLES = ['founder', 'ceo', 'office_manager']

interface OrganizationImport {
  name: string
  type?: string
  businessId?: string
  phone?: string
  email?: string
  address?: string
  website?: string
  isVendor?: boolean
  notes?: string
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role

    // Only elevated roles can perform bulk imports
    if (!ORGS_IMPORT_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'אין הרשאה לייבוא ארגונים' }, { status: 403 })
    }

    const userId = (session.user as any)?.id || null
    const body = await request.json()
    const { organizations } = body as { organizations: OrganizationImport[] }

    if (!organizations || !Array.isArray(organizations)) {
      return NextResponse.json({ error: 'נדרש מערך של ארגונים' }, { status: 400 })
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
      createdIds: [] as string[]
    }

    for (const org of organizations) {
      try {
        const existing = await prisma.organization.findFirst({
          where: { name: { equals: org.name, mode: 'insensitive' } }
        })

        if (existing) {
          results.skipped++
          continue
        }

        const created = await prisma.organization.create({
          data: {
            name: org.name,
            type: org.type || 'חברה פרטית',
            businessId: org.businessId || null,
            phone: org.phone || null,
            email: org.email || null,
            address: org.address || null,
            website: org.website || null,
            logoUrl: null,
            isVendor: org.isVendor ?? true,
            notes: org.notes || null,
            updatedById: userId,
          }
        })

        results.created++
        results.createdIds.push(created.id)
      } catch (err) {
        const error = err as Error
        results.errors.push(`${org.name}: ${error.message}`)
      }
    }

    // Logging - added (log bulk import as single action)
    if (results.created > 0) {
      await logCrud('CREATE', 'organizations', 'import', 'bulk',
        `ייבוא ${results.created} ארגונים`, {
        totalOrganizations: organizations.length,
        created: results.created,
        skipped: results.skipped,
        errors: results.errors.length,
      })
    }

    return NextResponse.json({
      success: true,
      message: `נוצרו ${results.created} ארגונים, דולגו ${results.skipped} קיימים`,
      ...results
    })
  } catch (error) {
    console.error('Import organizations error:', error)
    return NextResponse.json({ error: 'שגיאה בייבוא הארגונים' }, { status: 500 })
  }
}
