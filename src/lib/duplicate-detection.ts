// /home/user/wdi-erp/src/lib/duplicate-detection.ts
// Version: 20260115-000000
// FIXED: Set spread for ES5 compatibility - using Array.from()
// FIXED: Field names to match Prisma Schema (survivorId, mergedId, mergedSnapshot, relationsSnapshot)

import { prisma } from './prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ============ TYPES ============

export type EntityType = 'organization' | 'contact'

export type MatchType = 
  | 'exact_email' 
  | 'exact_phone' 
  | 'exact_business_id' 
  | 'name_similarity'
  | 'gemini_detected'

export interface DuplicateCandidate {
  entityType: EntityType
  primaryId: string
  secondaryId: string
  primaryName: string
  secondaryName: string
  matchType: MatchType
  algorithmScore: number
  geminiScore?: number
  geminiReason?: string
  finalScore: number
}

export interface FieldResolution {
  field: string
  value: any
  source: 'primary' | 'secondary' | 'merged'
}

export interface MergeResult {
  success: boolean
  survivorId: string
  mergedId: string
  mergeHistoryId: string
  transferredRelations: {
    contacts?: number
    reviews?: number
    projects?: number
  }
}

// ============ TEXT UTILITIES ============

export function normalizeText(text: string): string {
  if (!text) return ''
  return text
    .trim()
    .toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/["'״׳`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/בע"?מ|בעמ|ltd\.?|inc\.?|llc\.?|ח\.?פ\.?/gi, '')
    .trim()
}

export function normalizePhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

export function similarity(s1: string, s2: string): number {
  const n1 = normalizeText(s1)
  const n2 = normalizeText(s2)
  
  if (n1 === n2) return 1
  if (!n1 || !n2) return 0
  
  const longer = n1.length > n2.length ? n1 : n2
  const shorter = n1.length > n2.length ? n2 : n1
  
  if (longer.length === 0) return 1
  
  const costs: number[] = []
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (shorter[i - 1] !== longer[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[longer.length] = lastValue
  }
  
  return (longer.length - costs[longer.length]) / longer.length
}

// ============ ORGANIZATION DUPLICATE DETECTION ============

interface OrganizationRecord {
  id: string
  name: string
  phone: string | null
  email: string | null
  businessId: string | null
  website: string | null
  address: string | null
  contactTypes: string[]
  disciplines: string[]
  notes: string | null
  averageRating: number | null
  reviewCount: number
}

export async function findOrganizationCandidates(): Promise<DuplicateCandidate[]> {
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      businessId: true,
      website: true,
      address: true,
      contactTypes: true,
      disciplines: true,
      notes: true,
      averageRating: true,
      reviewCount: true,
    }
  })

  const candidates: DuplicateCandidate[] = []
  const checked = new Set<string>()

  for (let i = 0; i < organizations.length; i++) {
    for (let j = i + 1; j < organizations.length; j++) {
      const org1 = organizations[i]
      const org2 = organizations[j]
      const pairKey = [org1.id, org2.id].sort().join('-')
      
      if (checked.has(pairKey)) continue
      checked.add(pairKey)

      const match = checkOrganizationMatch(org1, org2)
      if (match) {
        candidates.push(match)
      }
    }
  }

  return candidates
}

function checkOrganizationMatch(
  org1: OrganizationRecord, 
  org2: OrganizationRecord
): DuplicateCandidate | null {
  // בדיקת ח.פ. זהה
  if (org1.businessId && org2.businessId) {
    const bid1 = org1.businessId.replace(/\D/g, '')
    const bid2 = org2.businessId.replace(/\D/g, '')
    if (bid1 === bid2 && bid1.length >= 8) {
      return {
        entityType: 'organization',
        primaryId: org1.id,
        secondaryId: org2.id,
        primaryName: org1.name,
        secondaryName: org2.name,
        matchType: 'exact_business_id',
        algorithmScore: 100,
        finalScore: 100,
      }
    }
  }

  // בדיקת טלפון זהה
  if (org1.phone && org2.phone) {
    const phone1 = normalizePhone(org1.phone)
    const phone2 = normalizePhone(org2.phone)
    if (phone1 === phone2 && phone1.length >= 9) {
      return {
        entityType: 'organization',
        primaryId: org1.id,
        secondaryId: org2.id,
        primaryName: org1.name,
        secondaryName: org2.name,
        matchType: 'exact_phone',
        algorithmScore: 100,
        finalScore: 100,
      }
    }
  }

  // בדיקת אימייל זהה
  if (org1.email && org2.email) {
    if (org1.email.toLowerCase() === org2.email.toLowerCase()) {
      return {
        entityType: 'organization',
        primaryId: org1.id,
        secondaryId: org2.id,
        primaryName: org1.name,
        secondaryName: org2.name,
        matchType: 'exact_email',
        algorithmScore: 100,
        finalScore: 100,
      }
    }
  }

  // בדיקת שם דומה
  const nameSim = similarity(org1.name, org2.name)
  if (nameSim >= 0.5) {
    return {
      entityType: 'organization',
      primaryId: org1.id,
      secondaryId: org2.id,
      primaryName: org1.name,
      secondaryName: org2.name,
      matchType: 'name_similarity',
      algorithmScore: Math.round(nameSim * 100),
      finalScore: Math.round(nameSim * 100),
    }
  }

  return null
}

// ============ CONTACT DUPLICATE DETECTION ============

interface ContactRecord {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  organizationId: string | null
  organization: { name: string } | null
  role: string | null
  contactTypes: string[]
  disciplines: string[]
  notes: string | null
  averageRating: number | null
  reviewCount: number
}

export async function findContactCandidates(): Promise<DuplicateCandidate[]> {
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      organizationId: true,
      organization: { select: { name: true } },
      role: true,
      contactTypes: true,
      disciplines: true,
      notes: true,
      averageRating: true,
      reviewCount: true,
    }
  })

  const candidates: DuplicateCandidate[] = []
  const checked = new Set<string>()

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const c1 = contacts[i]
      const c2 = contacts[j]
      const pairKey = [c1.id, c2.id].sort().join('-')
      
      if (checked.has(pairKey)) continue
      checked.add(pairKey)

      const match = checkContactMatch(c1, c2)
      if (match) {
        candidates.push(match)
      }
    }
  }

  return candidates
}

function checkContactMatch(
  c1: ContactRecord, 
  c2: ContactRecord
): DuplicateCandidate | null {
  const fullName1 = `${c1.firstName} ${c1.lastName}`
  const fullName2 = `${c2.firstName} ${c2.lastName}`

  // בדיקת טלפון זהה
  if (c1.phone && c2.phone) {
    const phone1 = normalizePhone(c1.phone)
    const phone2 = normalizePhone(c2.phone)
    if (phone1 === phone2 && phone1.length >= 9) {
      return {
        entityType: 'contact',
        primaryId: c1.id,
        secondaryId: c2.id,
        primaryName: fullName1,
        secondaryName: fullName2,
        matchType: 'exact_phone',
        algorithmScore: 100,
        finalScore: 100,
      }
    }
  }

  // בדיקת אימייל זהה
  if (c1.email && c2.email) {
    if (c1.email.toLowerCase() === c2.email.toLowerCase()) {
      return {
        entityType: 'contact',
        primaryId: c1.id,
        secondaryId: c2.id,
        primaryName: fullName1,
        secondaryName: fullName2,
        matchType: 'exact_email',
        algorithmScore: 100,
        finalScore: 100,
      }
    }
  }

  // בדיקת שם דומה
  const nameSim = similarity(fullName1, fullName2)
  if (nameSim >= 0.5) {
    return {
      entityType: 'contact',
      primaryId: c1.id,
      secondaryId: c2.id,
      primaryName: fullName1,
      secondaryName: fullName2,
      matchType: 'name_similarity',
      algorithmScore: Math.round(nameSim * 100),
      finalScore: Math.round(nameSim * 100),
    }
  }

  return null
}

// ============ GEMINI VALIDATION ============

export async function validateWithGemini(
  candidate: DuplicateCandidate,
  record1: any,
  record2: any
): Promise<{ isDuplicate: boolean; score: number; reason: string }> {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-001',
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 500,
    },
  })

  const entityLabel = candidate.entityType === 'organization' ? 'ארגונים' : 'אנשי קשר'
  
  const prompt = `אתה מערכת לזיהוי כפילויות ב${entityLabel}.

בדוק האם שתי הרשומות הבאות מתייחסות לאותו ${candidate.entityType === 'organization' ? 'ארגון' : 'אדם'}:

רשומה 1:
${JSON.stringify(record1, null, 2)}

רשומה 2:
${JSON.stringify(record2, null, 2)}

התחשב ב:
- שמות עם שגיאות כתיב או קיצורים (למשל: "יוסי" = "יוסף", "חח"י" = "חברת החשמל")
- מספרי טלפון עם פורמטים שונים
- ארגונים עם שמות בעברית ואנגלית
- תפקידים שונים באותו ארגון

החזר JSON בפורמט הבא בלבד (ללא markdown):
{
  "isDuplicate": true/false,
  "score": 0-100,
  "reason": "הסבר קצר בעברית"
}`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    const parsed = JSON.parse(text)
    return {
      isDuplicate: parsed.isDuplicate,
      score: parsed.score,
      reason: parsed.reason,
    }
  } catch (error) {
    console.error('Gemini validation error:', error)
    return {
      isDuplicate: false,
      score: 0,
      reason: 'שגיאה באימות',
    }
  }
}

// ============ MERGE OPERATIONS ============

export async function mergeOrganizations(
  survivorId: string,
  mergedId: string,
  fieldResolutions: FieldResolution[],
  userId: string
): Promise<MergeResult> {
  const survivor = await prisma.organization.findUnique({
    where: { id: survivorId },
    include: { contacts: true }
  })
  
  const merged = await prisma.organization.findUnique({
    where: { id: mergedId },
    include: { 
      contacts: { include: { individualReviews: true, projects: true } }
    }
  })

  if (!survivor || !merged) {
    throw new Error('אחד הארגונים לא נמצא')
  }

  // Snapshots לשחזור - לפי Schema
  const mergedSnapshot = { ...merged, contacts: undefined }
  const relationsSnapshot = {
    contacts: merged.contacts.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
  }

  // בניית אובייקט העדכון
  const updateData: any = {}
  const fieldResolutionsMap: Record<string, string> = {}
  
  for (const resolution of fieldResolutions) {
    fieldResolutionsMap[resolution.field] = resolution.source
    
    if (resolution.field === 'contactTypes' || resolution.field === 'disciplines') {
      const survivorArr = (survivor as any)[resolution.field] || []
      const mergedArr = (merged as any)[resolution.field] || []
      updateData[resolution.field] = Array.from(new Set([...survivorArr, ...mergedArr]))
    } else if (resolution.field === 'notes') {
      const survivorNotes = survivor.notes || ''
      const mergedNotes = merged.notes || ''
      if (mergedNotes) {
        updateData.notes = survivorNotes 
          ? `${survivorNotes}\n\n--- מוזג מ-${merged.name} (${new Date().toLocaleDateString('he-IL')}) ---\n${mergedNotes}`
          : mergedNotes
      }
    } else {
      updateData[resolution.field] = resolution.value
    }
  }

  updateData.updatedById = userId

  return await prisma.$transaction(async (tx) => {
    // 1. יצירת MergeHistory - לפי Schema
    const mergeHistory = await tx.mergeHistory.create({
      data: {
        entityType: 'organization',
        survivorId,
        mergedId,
        mergedSnapshot: mergedSnapshot as any,
        relationsSnapshot: relationsSnapshot as any,
        fieldResolutions: fieldResolutionsMap,
        mergedById: userId,
      }
    })

    // 2. העברת אנשי קשר
    const contactsTransferred = await tx.contact.updateMany({
      where: { organizationId: mergedId },
      data: { organizationId: survivorId }
    })

    // 3. עדכון Survivor
    await tx.organization.update({
      where: { id: survivorId },
      data: updateData
    })

    // 4. חישוב דירוג מחדש
    await recalculateOrganizationRating(tx, survivorId)

    // 5. מחיקת Merged
    await tx.organization.delete({
      where: { id: mergedId }
    })

    return {
      success: true,
      survivorId,
      mergedId,
      mergeHistoryId: mergeHistory.id,
      transferredRelations: {
        contacts: contactsTransferred.count
      }
    }
  })
}

export async function mergeContacts(
  survivorId: string,
  mergedId: string,
  fieldResolutions: FieldResolution[],
  userId: string
): Promise<MergeResult> {
  const survivor = await prisma.contact.findUnique({
    where: { id: survivorId },
    include: { 
      individualReviews: true, 
      projects: true,
      organization: true 
    }
  })
  
  const merged = await prisma.contact.findUnique({
    where: { id: mergedId },
    include: { 
      individualReviews: true, 
      projects: true,
      organization: true 
    }
  })

  if (!survivor || !merged) {
    throw new Error('אחד מאנשי הקשר לא נמצא')
  }

  // Snapshots לשחזור
  const mergedSnapshot = { 
    ...merged, 
    individualReviews: undefined, 
    projects: undefined,
    organization: undefined 
  }
  const relationsSnapshot = {
    reviews: merged.individualReviews.map(r => ({ id: r.id, projectId: r.projectId })),
    projects: merged.projects.map(p => ({ id: p.id, projectId: p.projectId, roleInProject: p.roleInProject })),
  }

  // בניית אובייקט העדכון
  const updateData: any = {}
  const fieldResolutionsMap: Record<string, string> = {}
  
  for (const resolution of fieldResolutions) {
    fieldResolutionsMap[resolution.field] = resolution.source
    
    if (resolution.field === 'contactTypes' || resolution.field === 'disciplines') {
      const survivorArr = (survivor as any)[resolution.field] || []
      const mergedArr = (merged as any)[resolution.field] || []
      updateData[resolution.field] = Array.from(new Set([...survivorArr, ...mergedArr]))
    } else if (resolution.field === 'notes') {
      const survivorNotes = survivor.notes || ''
      const mergedNotes = merged.notes || ''
      if (mergedNotes) {
        updateData.notes = survivorNotes 
          ? `${survivorNotes}\n\n--- מוזג מ-${merged.firstName} ${merged.lastName} (${new Date().toLocaleDateString('he-IL')}) ---\n${mergedNotes}`
          : mergedNotes
      }
    } else {
      updateData[resolution.field] = resolution.value
    }
  }

  updateData.updatedById = userId

  return await prisma.$transaction(async (tx) => {
    // 1. יצירת MergeHistory
    const mergeHistory = await tx.mergeHistory.create({
      data: {
        entityType: 'contact',
        survivorId,
        mergedId,
        mergedSnapshot: mergedSnapshot as any,
        relationsSnapshot: relationsSnapshot as any,
        fieldResolutions: fieldResolutionsMap,
        mergedById: userId,
      }
    })

    // 2. העברת דירוגים
    const reviewsTransferred = await tx.individualReview.updateMany({
      where: { contactId: mergedId },
      data: { contactId: survivorId }
    })

    // 3. העברת שיוכי פרויקטים (בזהירות - בדיקת כפילויות)
    const existingProjects = survivor.projects.map(p => p.projectId)
    const projectsToTransfer = merged.projects.filter(
      p => !existingProjects.includes(p.projectId)
    )
    
    let projectsTransferred = 0
    for (const cp of projectsToTransfer) {
      await tx.contactProject.update({
        where: { id: cp.id },
        data: { contactId: survivorId }
      })
      projectsTransferred++
    }

    // מחיקת שיוכים כפולים
    const duplicateProjects = merged.projects.filter(
      p => existingProjects.includes(p.projectId)
    )
    for (const dp of duplicateProjects) {
      await tx.contactProject.delete({ where: { id: dp.id } })
    }

    // 4. עדכון Survivor
    await tx.contact.update({
      where: { id: survivorId },
      data: updateData
    })

    // 5. חישוב דירוג מחדש
    await recalculateContactRating(tx, survivorId)

    // 6. מחיקת Merged
    await tx.contact.delete({
      where: { id: mergedId }
    })

    return {
      success: true,
      survivorId,
      mergedId,
      mergeHistoryId: mergeHistory.id,
      transferredRelations: {
        reviews: reviewsTransferred.count,
        projects: projectsTransferred
      }
    }
  })
}

// ============ UNDO MERGE ============

export async function undoMerge(
  mergeHistoryId: string,
  userId: string
): Promise<{ success: boolean; restoredId: string }> {
  const mergeHistory = await prisma.mergeHistory.findUnique({
    where: { id: mergeHistoryId }
  })

  if (!mergeHistory) {
    throw new Error('רשומת מיזוג לא נמצאה')
  }

  if (mergeHistory.undoneAt) {
    throw new Error('מיזוג זה כבר בוטל')
  }

  const mergedSnapshot = mergeHistory.mergedSnapshot as any
  const relationsSnapshot = mergeHistory.relationsSnapshot as any

  return await prisma.$transaction(async (tx) => {
    let restoredId: string

    if (mergeHistory.entityType === 'organization') {
      // שחזור ארגון
      const restored = await tx.organization.create({
        data: {
          id: mergedSnapshot.id,
          name: mergedSnapshot.name,
          type: mergedSnapshot.type,
          phone: mergedSnapshot.phone,
          email: mergedSnapshot.email,
          website: mergedSnapshot.website,
          address: mergedSnapshot.address,
          businessId: mergedSnapshot.businessId,
          logoUrl: mergedSnapshot.logoUrl,
          notes: mergedSnapshot.notes,
          isVendor: mergedSnapshot.isVendor,
          contactTypes: mergedSnapshot.contactTypes,
          disciplines: mergedSnapshot.disciplines,
          averageRating: mergedSnapshot.averageRating,
          reviewCount: mergedSnapshot.reviewCount,
        }
      })
      restoredId = restored.id

      // שחזור שיוך אנשי קשר
      if (relationsSnapshot?.contacts?.length > 0) {
        for (const contact of relationsSnapshot.contacts) {
          await tx.contact.update({
            where: { id: contact.id },
            data: { organizationId: restoredId }
          }).catch(() => {})
        }
      }
    } else {
      // שחזור איש קשר
      const restored = await tx.contact.create({
        data: {
          id: mergedSnapshot.id,
          firstName: mergedSnapshot.firstName,
          lastName: mergedSnapshot.lastName,
          nickname: mergedSnapshot.nickname,
          phone: mergedSnapshot.phone,
          phoneAlt: mergedSnapshot.phoneAlt,
          email: mergedSnapshot.email,
          emailAlt: mergedSnapshot.emailAlt,
          linkedinUrl: mergedSnapshot.linkedinUrl,
          photoUrl: mergedSnapshot.photoUrl,
          organizationId: mergedSnapshot.organizationId,
          role: mergedSnapshot.role,
          department: mergedSnapshot.department,
          contactTypes: mergedSnapshot.contactTypes,
          disciplines: mergedSnapshot.disciplines,
          status: mergedSnapshot.status,
          notes: mergedSnapshot.notes,
          vendorId: mergedSnapshot.vendorId,
          averageRating: mergedSnapshot.averageRating,
          reviewCount: mergedSnapshot.reviewCount,
        }
      })
      restoredId = restored.id

      // שחזור דירוגים
      if (relationsSnapshot?.reviews?.length > 0) {
        for (const review of relationsSnapshot.reviews) {
          await tx.individualReview.update({
            where: { id: review.id },
            data: { contactId: restoredId }
          }).catch(() => {})
        }
      }

      // שחזור שיוכי פרויקטים
      if (relationsSnapshot?.projects?.length > 0) {
        for (const cp of relationsSnapshot.projects) {
          await tx.contactProject.create({
            data: {
              contactId: restoredId,
              projectId: cp.projectId,
              roleInProject: cp.roleInProject,
            }
          }).catch(() => {})
        }
      }

      // חישוב דירוג מחדש
      await recalculateContactRating(tx, restoredId)
    }

    // סימון המיזוג כמבוטל
    await tx.mergeHistory.update({
      where: { id: mergeHistoryId },
      data: {
        undoneAt: new Date(),
        undoneById: userId
      }
    })

    return { success: true, restoredId }
  })
}

// ============ RATING RECALCULATION ============

async function recalculateContactRating(tx: any, contactId: string) {
  const reviews = await tx.individualReview.findMany({
    where: { contactId },
    select: { avgRating: true }
  })

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + (r.avgRating || 0), 0) / reviews.length
    : null

  await tx.contact.update({
    where: { id: contactId },
    data: {
      averageRating: avgRating,
      reviewCount: reviews.length
    }
  })
}

async function recalculateOrganizationRating(tx: any, organizationId: string) {
  const contacts = await tx.contact.findMany({
    where: { 
      organizationId,
      reviewCount: { gt: 0 }
    },
    select: { averageRating: true, reviewCount: true }
  })

  if (contacts.length === 0) {
    await tx.organization.update({
      where: { id: organizationId },
      data: { averageRating: null, reviewCount: 0 }
    })
    return
  }

  let totalWeight = 0
  let weightedSum = 0
  
  for (const contact of contacts) {
    if (contact.averageRating !== null) {
      weightedSum += contact.averageRating * contact.reviewCount
      totalWeight += contact.reviewCount
    }
  }

  const avgRating = totalWeight > 0 ? weightedSum / totalWeight : null
  const reviewCount = contacts.reduce((sum: number, c: any) => sum + c.reviewCount, 0)

  await tx.organization.update({
    where: { id: organizationId },
    data: { averageRating: avgRating, reviewCount }
  })
}
