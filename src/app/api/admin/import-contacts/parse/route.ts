// Version: 20251218-065000
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// פונקציית נרמול לזיהוי כפילויות
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/["'״׳`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/בע"?מ|בעמ|ltd\.?|inc\.?|llc\.?/gi, '')
    .trim()
}

// חישוב דמיון (Levenshtein-based)
function similarity(s1: string, s2: string): number {
  const n1 = normalizeText(s1)
  const n2 = normalizeText(s2)
  
  if (n1 === n2) return 1
  
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

// סוגי התאמה
type MatchStatus = 'new' | 'duplicate' | 'merge' | 'low_confidence'

interface MatchResult {
  status: MatchStatus
  existing?: any
  similarity: number
  matchType: 'exact_phone' | 'exact_email' | 'name_similar' | 'none'
  fieldsToMerge?: string[] // שדות שיש בחדש ואין בקיים
}

// בדיקת התאמה לארגון
function matchOrganization(org: any, existingOrgs: any[]): MatchResult {
  if (!org?.name) {
    return { status: 'new', similarity: 0, matchType: 'none' }
  }

  for (const existing of existingOrgs) {
    // בדיקת טלפון זהה (כפילות מוחלטת)
    if (org.phone && existing.phone) {
      const newPhone = org.phone.replace(/\D/g, '')
      const existingPhone = existing.phone.replace(/\D/g, '')
      if (newPhone === existingPhone && newPhone.length >= 9) {
        return { 
          status: 'duplicate', 
          existing, 
          similarity: 1, 
          matchType: 'exact_phone' 
        }
      }
    }

    // בדיקת אימייל זהה (כפילות מוחלטת)
    if (org.email && existing.email) {
      if (org.email.toLowerCase() === existing.email.toLowerCase()) {
        return { 
          status: 'duplicate', 
          existing, 
          similarity: 1, 
          matchType: 'exact_email' 
        }
      }
    }

    // בדיקת שם דומה (MERGE)
    const nameSim = similarity(org.name, existing.name)
    if (nameSim >= 0.85) {
      // זיהוי שדות למיזוג: חדש מלא + קיים ריק
      const fieldsToMerge: string[] = []
      if (org.phone && !existing.phone) fieldsToMerge.push('phone')
      if (org.email && !existing.email) fieldsToMerge.push('email')
      if (org.website && !existing.website) fieldsToMerge.push('website')
      if (org.address && !existing.address) fieldsToMerge.push('address')
      if (org.businessId && !existing.businessId) fieldsToMerge.push('businessId')

      return {
        status: nameSim === 1 ? 'duplicate' : 'merge',
        existing,
        similarity: nameSim,
        matchType: 'name_similar',
        fieldsToMerge
      }
    }
  }

  return { status: 'new', similarity: 0, matchType: 'none' }
}

// בדיקת התאמה לאיש קשר
function matchContact(contact: any, existingContacts: any[]): MatchResult {
  if (!contact?.firstName || !contact?.lastName) {
    return { status: 'low_confidence', similarity: 0, matchType: 'none' }
  }

  const fullName = `${contact.firstName} ${contact.lastName}`

  for (const existing of existingContacts) {
    // בדיקת טלפון זהה
    if (contact.phone && existing.phone) {
      const newPhone = contact.phone.replace(/\D/g, '')
      const existingPhone = existing.phone.replace(/\D/g, '')
      if (newPhone === existingPhone && newPhone.length >= 9) {
        const fieldsToMerge: string[] = []
        if (contact.email && !existing.email) fieldsToMerge.push('email')
        if (contact.role && !existing.role) fieldsToMerge.push('role')
        
        return { 
          status: fieldsToMerge.length > 0 ? 'merge' : 'duplicate',
          existing, 
          similarity: 1, 
          matchType: 'exact_phone',
          fieldsToMerge
        }
      }
    }

    // בדיקת אימייל זהה
    if (contact.email && existing.email) {
      if (contact.email.toLowerCase() === existing.email.toLowerCase()) {
        const fieldsToMerge: string[] = []
        if (contact.phone && !existing.phone) fieldsToMerge.push('phone')
        if (contact.role && !existing.role) fieldsToMerge.push('role')
        
        return { 
          status: fieldsToMerge.length > 0 ? 'merge' : 'duplicate',
          existing, 
          similarity: 1, 
          matchType: 'exact_email',
          fieldsToMerge
        }
      }
    }

    // בדיקת שם דומה
    const existingFullName = `${existing.firstName} ${existing.lastName}`
    const nameSim = similarity(fullName, existingFullName)
    if (nameSim >= 0.85) {
      const fieldsToMerge: string[] = []
      if (contact.phone && !existing.phone) fieldsToMerge.push('phone')
      if (contact.email && !existing.email) fieldsToMerge.push('email')
      if (contact.role && !existing.role) fieldsToMerge.push('role')

      return {
        status: nameSim === 1 && fieldsToMerge.length === 0 ? 'duplicate' : 'merge',
        existing,
        similarity: nameSim,
        matchType: 'name_similar',
        fieldsToMerge
      }
    }
  }

  return { status: 'new', similarity: 0, matchType: 'none' }
}

// בדיקת כל הרשומות מול DB
async function analyzeRecords(parsed: any[]) {
  const existingOrgs = await prisma.organization.findMany({
    select: { id: true, name: true, phone: true, email: true, website: true, address: true, businessId: true }
  })
  
  const existingContacts = await prisma.contact.findMany({
    select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, organizationId: true }
  })
  
  return parsed.map(item => {
    const orgMatch = matchOrganization(item.organization, existingOrgs)
    const contactMatch = matchContact(item.contact, existingContacts)
    
    // קביעת סטטוס כללי
    let overallStatus: MatchStatus = 'new'
    if (item.confidence < 0.6) {
      overallStatus = 'low_confidence'
    } else if (orgMatch.status === 'duplicate' && contactMatch.status === 'duplicate') {
      overallStatus = 'duplicate'
    } else if (orgMatch.status === 'merge' || contactMatch.status === 'merge') {
      overallStatus = 'merge'
    }

    return {
      ...item,
      analysis: {
        overallStatus,
        organization: orgMatch,
        contact: contactMatch
      }
    }
  })
}

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

    const { rawInput, sourceContext } = await request.json()
    
    if (!rawInput || !rawInput.trim()) {
      return NextResponse.json({ error: 'לא התקבל טקסט לעיבוד' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-001',
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 16384,
      },
    })
    
    const prompt = `אתה מערכת לניתוח רשימות אנשי קשר עבור חברת ניהול פרויקטי בנייה.

הקשר מהמשתמש: "${sourceContext || 'לא צוין'}"

נתח את הטקסט הבא וחלץ ממנו ארגונים ואנשי קשר.

עבור כל רשומה, זהה:
1. **ארגון** (אם יש): שם, טלפון, אימייל, אתר, כתובת
2. **איש קשר**: שם פרטי, שם משפחה, טלפון, אימייל, תפקיד
3. **סוגי קשר** (בחר מהרשימה): ספק, יועץ, קבלן, לקוח, רשות
4. **דיסציפלינות** (בחר מהרשימה): אדריכלות, הנדסת מבנים, חשמל, מיזוג אוויר, אינסטלציה, בטיחות, נגישות, קונסטרוקציה, ניהול פרויקטים, אחר

החזר JSON בפורמט הבא בלבד (בלי markdown, בלי הסברים):
{
  "parsed": [
    {
      "organization": {
        "name": "שם הארגון או null",
        "phone": "טלפון או null",
        "email": "אימייל או null",
        "website": "אתר או null",
        "address": "כתובת או null"
      },
      "contact": {
        "firstName": "שם פרטי",
        "lastName": "שם משפחה",
        "phone": "טלפון או null",
        "email": "אימייל או null",
        "role": "תפקיד או null",
        "contactTypes": ["יועץ"],
        "disciplines": ["אדריכלות"]
      },
      "confidence": 0.95,
      "rawLine": "השורה המקורית"
    }
  ]
}

טקסט לניתוח:
${rawInput}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text()
    
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      console.error('Failed to parse Gemini response:', text)
      return NextResponse.json({ 
        error: 'שגיאה בפענוח תשובת AI',
        rawResponse: text.substring(0, 500)
      }, { status: 500 })
    }
    
    // ניתוח מול DB
    const analyzed = await analyzeRecords(parsed.parsed || [])
    
    // חלוקה לקטגוריות
    const results = {
      new: analyzed.filter(item => item.analysis.overallStatus === 'new'),
      merge: analyzed.filter(item => item.analysis.overallStatus === 'merge'),
      duplicate: analyzed.filter(item => item.analysis.overallStatus === 'duplicate'),
      lowConfidence: analyzed.filter(item => item.analysis.overallStatus === 'low_confidence'),
      total: analyzed.length
    }
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error('Import parse error:', error)
    return NextResponse.json({ 
      error: 'שגיאה בעיבוד הנתונים',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
