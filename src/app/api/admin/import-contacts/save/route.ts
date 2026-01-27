// Version: 20260124
// FIXED: Wrap entire import in transaction - all or nothing
// OBSERVABILITY: Added logCrud for import-save audit trail
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (!['owner', 'executive', 'trust_officer'].includes(userRole)) {
      return NextResponse.json({ error: 'אין הרשאה לייבוא' }, { status: 403 })
    }

    const { contacts, sourceContext } = await request.json()

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'לא התקבלו נתונים לייבוא' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      let organizationsCreated = 0
      let organizationsUpdated = 0
      let contactsCreated = 0
      let contactsUpdated = 0
      let skipped = 0
      const details: any[] = []

      for (const item of contacts) {
        let organizationId: string | null = null
        const enrichedOrg = item.enriched?.organization
        const enrichedContacts = item.enriched?.contacts || []

        // יצירה/עדכון ארגון
        if (item.organization?.name || enrichedOrg?.name) {
          const orgName = enrichedOrg?.name || item.organization?.name

          const existingOrg = await tx.organization.findFirst({
            where: {
              OR: [
                { name: { equals: orgName, mode: 'insensitive' } },
                { name: { equals: item.organization?.name, mode: 'insensitive' } }
              ]
            }
          })

          if (existingOrg) {
            organizationId = existingOrg.id

            await tx.organization.update({
              where: { id: existingOrg.id },
              data: {
                name: enrichedOrg?.name || existingOrg.name,
                type: enrichedOrg?.type || existingOrg.type,
                businessId: enrichedOrg?.businessId || existingOrg.businessId,
                phone: enrichedOrg?.phone || existingOrg.phone,
                email: enrichedOrg?.email || existingOrg.email,
                address: enrichedOrg?.address || existingOrg.address,
                website: enrichedOrg?.website || existingOrg.website,
                notes: enrichedOrg?.notes || existingOrg.notes
              }
            })
            organizationsUpdated++
            details.push({
              name: enrichedOrg?.name || existingOrg.name,
              type: 'organization',
              status: 'updated'
            })
          } else {
            const newOrg = await tx.organization.create({
              data: {
                name: enrichedOrg?.name || item.organization?.name || '',
                type: enrichedOrg?.type || null,
                businessId: enrichedOrg?.businessId || null,
                phone: enrichedOrg?.phone || item.organization?.phone || null,
                email: enrichedOrg?.email || item.organization?.email || null,
                address: enrichedOrg?.address || item.organization?.address || null,
                website: enrichedOrg?.website || item.organization?.website || null,
                notes: enrichedOrg?.notes || null,
                isVendor: true
              }
            })
            organizationId = newOrg.id
            organizationsCreated++
            details.push({
              name: newOrg.name,
              type: 'organization',
              status: 'created',
              id: newOrg.id
            })
          }
        }

        // יצירת/עדכון איש קשר מהקלט המקורי
        if (item.contact?.firstName && item.contact.firstName.trim()) {
          const contactResult = await createOrUpdateContact(tx, {
            firstName: item.contact.firstName,
            lastName: item.contact.lastName || '',
            phone: item.contact.phone,
            email: item.contact.email,
            role: item.contact.role,
            contactTypes: item.contact.contactTypes || [],
            disciplines: item.contact.disciplines || [],
            organizationId
          })

          if (contactResult.created) {
            contactsCreated++
            details.push({
              name: `${item.contact.firstName} ${item.contact.lastName}`,
              type: 'contact',
              status: 'created',
              id: contactResult.id
            })
          } else if (contactResult.updated) {
            contactsUpdated++
            details.push({
              name: `${item.contact.firstName} ${item.contact.lastName}`,
              type: 'contact',
              status: 'updated',
              id: contactResult.id
            })
          } else {
            skipped++
          }
        }

        // יצירת/עדכון אנשי קשר מההעשרה
        for (const ec of enrichedContacts) {
          if (!ec.firstName) continue

          const contactResult = await createOrUpdateContact(tx, {
            firstName: ec.firstName,
            lastName: ec.lastName || '',
            phone: ec.phone,
            email: ec.email,
            role: ec.role,
            contactTypes: ec.contactTypes || ['ספק'],
            disciplines: ec.disciplines || [],
            notes: ec.notes,
            organizationId
          })

          if (contactResult.created) {
            contactsCreated++
            details.push({
              name: `${ec.firstName} ${ec.lastName || ''}`,
              type: 'contact',
              status: 'created',
              source: 'enriched',
              id: contactResult.id
            })
          } else if (contactResult.updated) {
            contactsUpdated++
            details.push({
              name: `${ec.firstName} ${ec.lastName || ''}`,
              type: 'contact',
              status: 'updated',
              source: 'enriched',
              id: contactResult.id
            })
          }
        }
      }

      return { organizationsCreated, organizationsUpdated, contactsCreated, contactsUpdated, skipped, details }
    })

    // שמירת לוג - outside transaction
    try {
      await prisma.importLog.create({
        data: {
          importType: 'contacts',
          sourceContext: sourceContext || null,
          totalRecords: contacts.length,
          newRecords: result.contactsCreated,
          mergedRecords: result.organizationsCreated + result.organizationsUpdated + result.contactsUpdated,
          skippedRecords: result.skipped,
          details: result.details,
          status: 'completed',
          importedById: (session.user as any).id
        }
      })

      // Audit logging for ActivityLog
      const totalCreated = result.organizationsCreated + result.contactsCreated
      const totalUpdated = result.organizationsUpdated + result.contactsUpdated
      await logCrud('CREATE', 'admin', 'import-contacts', 'bulk',
        `ייבוא אנשי קשר: ${totalCreated} נוצרו, ${totalUpdated} עודכנו`, {
        totalRecords: contacts.length,
        organizationsCreated: result.organizationsCreated,
        organizationsUpdated: result.organizationsUpdated,
        contactsCreated: result.contactsCreated,
        contactsUpdated: result.contactsUpdated,
        skipped: result.skipped,
        sourceContext: sourceContext || null,
      })
    } catch (logError) {
      console.error('Failed to create import log:', logError)
    }

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'שגיאה בייבוא אנשי קשר' },
      { status: 500 }
    )
  }
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

async function createOrUpdateContact(tx: TxClient, data: {
  firstName: string
  lastName: string
  phone?: string | null
  email?: string | null
  role?: string | null
  contactTypes?: string[]
  disciplines?: string[]
  notes?: string | null
  organizationId: string | null
}): Promise<{ id: string; created: boolean; updated: boolean }> {

  // חיפוש איש קשר קיים
  const existing = await tx.contact.findFirst({
    where: {
      OR: [
        data.phone ? { phone: data.phone } : {},
        data.email ? { email: data.email } : {},
        {
          AND: [
            { firstName: data.firstName },
            { lastName: data.lastName },
            { organizationId: data.organizationId }
          ]
        }
      ].filter(obj => Object.keys(obj).length > 0)
    }
  })

  if (existing) {
    // עדכון איש קשר קיים - רק שדות שחסרים
    const updateData: any = {}
    
    if (!existing.phone && data.phone) updateData.phone = data.phone
    if (!existing.email && data.email) updateData.email = data.email
    if (!existing.role && data.role) updateData.role = data.role
    if (!existing.notes && data.notes) updateData.notes = data.notes
    if (!existing.organizationId && data.organizationId) updateData.organizationId = data.organizationId
    
    // עדכון contactTypes - מיזוג
    if (data.contactTypes && data.contactTypes.length > 0) {
      const existingTypes = existing.contactTypes || []
      const newTypes = Array.from(new Set([...existingTypes, ...data.contactTypes]))
      if (newTypes.length > existingTypes.length) {
        updateData.contactTypes = newTypes
      }
    }
    
    // עדכון disciplines - מיזוג
    if (data.disciplines && data.disciplines.length > 0) {
      const existingDisc = existing.disciplines || []
      const newDisc = Array.from(new Set([...existingDisc, ...data.disciplines]))
      if (newDisc.length > existingDisc.length) {
        updateData.disciplines = newDisc
      }
    }

    if (Object.keys(updateData).length > 0) {
      await tx.contact.update({
        where: { id: existing.id },
        data: updateData
      })
      return { id: existing.id, created: false, updated: true }
    }

    return { id: existing.id, created: false, updated: false }
  }

  // יצירת איש קשר חדש
  const newContact = await tx.contact.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || '',
      email: data.email || null,
      role: data.role || null,
      contactTypes: data.contactTypes || [],
      disciplines: data.disciplines || [],
      notes: data.notes || null,
      organizationId: data.organizationId,
      status: 'פעיל'
    }
  })

  return { id: newContact.id, created: true, updated: false }
}
