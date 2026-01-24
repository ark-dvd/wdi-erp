// src/app/api/contacts/import/route.ts
// Version: 20260124
// FIXED: Wrap entire import in transaction - all or nothing

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

interface ContactImport {
  firstName: string
  lastName?: string
  phone: string
  email?: string
  role?: string
  contactTypes?: string[]
  disciplines?: string[]
  organizationName?: string
  organizationId?: string
  notes?: string
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id || null
    const body = await request.json()
    const { contacts } = body as { contacts: ContactImport[] }

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ error: 'נדרש מערך של אנשי קשר' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const results = {
        created: 0,
        skipped: 0,
        createdIds: [] as string[]
      }

      const orgCache: Record<string, string | null> = {}

      for (const contact of contacts) {
        if (!contact.firstName || !contact.phone) {
          throw new Error(`חסר שם פרטי או טלפון: ${contact.firstName || 'ללא שם'}`)
        }

        const existingByPhone = await tx.contact.findFirst({
          where: { phone: contact.phone }
        })

        if (existingByPhone) {
          results.skipped++
          continue
        }

        if (contact.email) {
          const existingByEmail = await tx.contact.findFirst({
            where: { email: { equals: contact.email, mode: 'insensitive' } }
          })
          if (existingByEmail) {
            results.skipped++
            continue
          }
        }

        let organizationId: string | null = contact.organizationId || null

        if (!organizationId && contact.organizationName) {
          if (contact.organizationName in orgCache) {
            organizationId = orgCache[contact.organizationName]
          } else {
            const org = await tx.organization.findFirst({
              where: { name: { equals: contact.organizationName, mode: 'insensitive' } }
            })
            organizationId = org?.id || null
            orgCache[contact.organizationName] = organizationId
          }
        }

        const created = await tx.contact.create({
          data: {
            firstName: contact.firstName,
            lastName: contact.lastName || '',
            phone: contact.phone,
            email: contact.email || null,
            role: contact.role || null,
            contactTypes: contact.contactTypes || ['יועץ'],
            disciplines: contact.disciplines || [],
            organizationId: organizationId,
            notes: contact.notes || null,
            status: 'פעיל',
            updatedById: userId,
          }
        })

        results.created++
        results.createdIds.push(created.id)
      }

      return results
    })

    return NextResponse.json({
      success: true,
      message: `נוצרו ${result.created} אנשי קשר, דולגו ${result.skipped} קיימים`,
      ...result
    })
  } catch (error) {
    console.error('Import contacts error:', error)
    const message = error instanceof Error ? error.message : 'שגיאה בייבוא אנשי הקשר'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
