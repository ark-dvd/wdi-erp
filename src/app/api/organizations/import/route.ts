// ============================================
// src/app/api/organizations/import/route.ts
// Version: 20260127
// RBAC v2: Use permission system from DOC-013/DOC-014
// IDEMPOTENCY: Wrapped in transaction for atomicity (all-or-nothing)
// ============================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'
import { requirePermission } from '@/lib/permissions'

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

    // RBAC v2: Check create permission (organizations use 'contacts' module per DOC-013 §6.1)
    const denied = await requirePermission(session, 'contacts', 'create')
    if (denied) return denied

    const userId = (session!.user as any)?.id || null
    const body = await request.json()
    const { organizations } = body as { organizations: OrganizationImport[] }

    if (!organizations || !Array.isArray(organizations)) {
      return NextResponse.json({ error: 'נדרש מערך של ארגונים' }, { status: 400 })
    }

    // Wrap entire import in transaction for atomicity (all-or-nothing)
    const result = await prisma.$transaction(async (tx) => {
      const results = {
        created: 0,
        skipped: 0,
        createdIds: [] as string[]
      }

      for (const org of organizations) {
        if (!org.name) {
          throw new Error('חסר שם ארגון')
        }

        const existing = await tx.organization.findFirst({
          where: { name: { equals: org.name, mode: 'insensitive' } }
        })

        if (existing) {
          results.skipped++
          continue
        }

        const created = await tx.organization.create({
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
      }

      return results
    })

    // Logging - outside transaction (non-critical)
    if (result.created > 0) {
      await logCrud('CREATE', 'organizations', 'import', 'bulk',
        `ייבוא ${result.created} ארגונים`, {
        totalOrganizations: organizations.length,
        created: result.created,
        skipped: result.skipped,
      })
    }

    return NextResponse.json({
      success: true,
      message: `נוצרו ${result.created} ארגונים, דולגו ${result.skipped} קיימים`,
      ...result
    })
  } catch (error) {
    console.error('Import organizations error:', error)
    return NextResponse.json({ error: 'שגיאה בייבוא הארגונים' }, { status: 500 })
  }
}
