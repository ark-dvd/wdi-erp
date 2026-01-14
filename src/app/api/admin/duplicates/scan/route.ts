// /home/user/wdi-erp/src/app/api/admin/duplicates/scan/route.ts
// Version: 20260114-223000
// FIXED: N+1 query issue - pre-fetch all records into Maps

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import {
  findOrganizationCandidates,
  findContactCandidates,
  validateWithGemini,
  DuplicateCandidate,
} from '@/lib/duplicate-detection'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== 'founder') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const { entityTypes = ['organization', 'contact'], useGemini = true } = await request.json()

    const results = {
      organizations: { scanned: 0, candidates: 0, saved: 0 },
      contacts: { scanned: 0, candidates: 0, saved: 0 },
    }

    // סריקת ארגונים
    if (entityTypes.includes('organization')) {
      const orgCandidates = await findOrganizationCandidates()
      results.organizations.scanned = await prisma.organization.count()
      results.organizations.candidates = orgCandidates.length

      // Pre-fetch all organizations into Map (N+1 fix)
      const allOrgs = await prisma.organization.findMany({
        select: { id: true, name: true, phone: true, email: true, businessId: true, website: true, address: true }
      })
      const orgMap = new Map(allOrgs.map(o => [o.id, o]))

      for (const candidate of orgCandidates) {
        // בדיקה אם כבר קיים DuplicateSet לזוג הזה
        const existing = await prisma.duplicateSet.findFirst({
          where: {
            entityType: 'organization',
            OR: [
              { primaryId: candidate.primaryId, secondaryId: candidate.secondaryId },
              { primaryId: candidate.secondaryId, secondaryId: candidate.primaryId },
            ],
            status: { in: ['pending', 'merged'] }
          }
        })

        if (existing) continue

        // אימות עם Gemini אם נדרש
        let finalScore = candidate.algorithmScore
        let geminiReason = null

        if (useGemini && candidate.algorithmScore < 100) {
          const org1 = orgMap.get(candidate.primaryId)
          const org2 = orgMap.get(candidate.secondaryId)

          if (org1 && org2) {
            const geminiResult = await validateWithGemini(candidate, org1, org2)
            
            if (!geminiResult.isDuplicate && geminiResult.score < 70) {
              // Gemini קבע שזה לא כפילות - דלג
              continue
            }

            finalScore = geminiResult.score
            geminiReason = geminiResult.reason
          }
        }

        // שמירת DuplicateSet רק אם הציון מספיק גבוה
        if (finalScore >= 70) {
          await prisma.duplicateSet.create({
            data: {
              entityType: 'organization',
              primaryId: candidate.primaryId,
              secondaryId: candidate.secondaryId,
              matchType: candidate.matchType,
              score: finalScore,
              reason: geminiReason || getMatchTypeReason(candidate.matchType),
              status: 'pending',
              reviewedById: null,
            }
          })
          results.organizations.saved++
        }
      }
    }

    // סריקת אנשי קשר
    if (entityTypes.includes('contact')) {
      const contactCandidates = await findContactCandidates()
      results.contacts.scanned = await prisma.contact.count()
      results.contacts.candidates = contactCandidates.length

      // Pre-fetch all contacts into Map (N+1 fix)
      const allContacts = await prisma.contact.findMany({
        select: { 
          id: true, firstName: true, lastName: true, phone: true, email: true, 
          role: true, organization: { select: { name: true } } 
        }
      })
      const contactMap = new Map(allContacts.map(c => [c.id, c]))

      for (const candidate of contactCandidates) {
        // בדיקה אם כבר קיים
        const existing = await prisma.duplicateSet.findFirst({
          where: {
            entityType: 'contact',
            OR: [
              { primaryId: candidate.primaryId, secondaryId: candidate.secondaryId },
              { primaryId: candidate.secondaryId, secondaryId: candidate.primaryId },
            ],
            status: { in: ['pending', 'merged'] }
          }
        })

        if (existing) continue

        let finalScore = candidate.algorithmScore
        let geminiReason = null

        if (useGemini && candidate.algorithmScore < 100) {
          const c1 = contactMap.get(candidate.primaryId)
          const c2 = contactMap.get(candidate.secondaryId)

          if (c1 && c2) {
            const geminiResult = await validateWithGemini(candidate, c1, c2)
            
            if (!geminiResult.isDuplicate && geminiResult.score < 70) {
              continue
            }

            finalScore = geminiResult.score
            geminiReason = geminiResult.reason
          }
        }

        if (finalScore >= 70) {
          await prisma.duplicateSet.create({
            data: {
              entityType: 'contact',
              primaryId: candidate.primaryId,
              secondaryId: candidate.secondaryId,
              matchType: candidate.matchType,
              score: finalScore,
              reason: geminiReason || getMatchTypeReason(candidate.matchType),
              status: 'pending',
              reviewedById: null,
            }
          })
          results.contacts.saved++
        }
      }
    }

    // רישום פעילות
    await logActivity({
      action: 'CREATE',
      category: 'data',
      module: 'admin',
      targetType: 'duplicate_scan',
      details: results
    })

    return NextResponse.json({
      success: true,
      results,
      message: `נמצאו ${results.organizations.saved + results.contacts.saved} כפילויות חדשות`
    })

  } catch (error) {
    console.error('Duplicate scan error:', error)
    return NextResponse.json({ 
      error: 'שגיאה בסריקה',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getMatchTypeReason(matchType: string): string {
  switch (matchType) {
    case 'exact_email': return 'אימייל זהה'
    case 'exact_phone': return 'טלפון זהה'
    case 'exact_business_id': return 'ח.פ. זהה'
    case 'name_similarity': return 'שם דומה'
    default: return 'התאמה אלגוריתמית'
  }
}
