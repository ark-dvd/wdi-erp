// src/app/api/contacts/import/route.ts
// גרסה: v20251217-201000

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

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
      createdIds: [] as string[]
    }

    const orgCache: Record<string, string | null> = {}

    for (const contact of contacts) {
      try {
        if (!contact.firstName || !contact.phone) {
          results.errors.push(`חסר שם פרטי או טלפון: ${contact.firstName || 'ללא שם'}`)
          continue
        }

        const existingByPhone = await prisma.contact.findFirst({
          where: { phone: contact.phone }
        })

        if (existingByPhone) {
          results.skipped++
          continue
        }

        if (contact.email) {
          const existingByEmail = await prisma.contact.findFirst({
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
            const org = await prisma.organization.findFirst({
              where: { name: { equals: contact.organizationName, mode: 'insensitive' } }
            })
            organizationId = org?.id || null
            orgCache[contact.organizationName] = organizationId
          }
        }

        const created = await prisma.contact.create({
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
      } catch (err) {
        const error = err as Error
        results.errors.push(`${contact.firstName} ${contact.lastName}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `נוצרו ${results.created} אנשי קשר, דולגו ${results.skipped} קיימים`,
      ...results
    })
  } catch (error) {
    console.error('Import contacts error:', error)
    return NextResponse.json({ error: 'שגיאה בייבוא אנשי הקשר' }, { status: 500 })
  }
}
