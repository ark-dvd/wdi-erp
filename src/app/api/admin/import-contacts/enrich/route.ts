// Version: 20251218-094500
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const { organizations } = await request.json()

    if (!organizations || !Array.isArray(organizations)) {
      return NextResponse.json({ error: 'לא התקבלו ארגונים להעשרה' }, { status: 400 })
    }

    const enrichedResults = []

    for (const org of organizations) {
      try {
        const prompt = `אתה מומחה לאיסוף מידע עסקי. חפש מידע מקיף ומדויק על "${org.name}" בישראל.

=== שדות ארגון (מלא הכל!) ===
- name: השם הרשמי המלא כפי שרשום ברשם החברות (לא השם שהמשתמש הקליד!)
- type: סוג ארגון - בחר אחד: "חברה פרטית" / "חברה ציבורית" / "עמותה" / "רשות" / "שותפות"
- businessId: מספר ח.פ. או עוסק מורשה
- phone: טלפון משרד ראשי
- email: אימייל כללי של המשרד
- address: כתובת מלאה (רחוב, מספר, עיר, מיקוד)
- website: URL מלא של האתר
- contactTypes: מערך - בחר מתוך: ["ספק", "יועץ", "קבלן", "לקוח", "רשות"]
- disciplines: מערך של תחומי התמחות - בחר מתוך: ["אדריכלות", "אדריכלות - פנים", "אדריכלות נוף ופיתוח שטח", "הנדסת מבנים", "הנדסת חשמל", "הנדסת אינסטלציה", "הנדסת מיזוג", "הנדסת קרקע וביסוס", "הנדסת תנועה ותחבורה", "ניהול פרויקטים", "פיקוח", "בקרת תקציב", "יעוץ בטיחות", "יעוץ נגישות", "יעוץ קירות מסך", "מדידות", "אקוסטיקה", "LEED/בנייה ירוקה"]
- notes: תיאור קצר של הארגון ותחומי פעילותו

=== אנשי קשר (לכל איש קשר - מלא הכל!) ===
- firstName: שם פרטי
- lastName: שם משפחה
- phone: טלפון נייד אישי
- email: אימייל אישי או עבודה
- role: תפקיד מדויק (מנכ"ל, שותף בכיר, אדריכל ראשי וכו')
- linkedIn: קישור לפרופיל לינקדאין
- contactTypes: מערך - בחר מתוך: ["ספק", "יועץ", "קבלן", "לקוח", "רשות"]
- disciplines: מערך - אותן אפשרויות כמו למעלה
- notes: מידע נוסף על האיש (התמחויות, פרויקטים בולטים וכו')

חפש באתר החברה (עמוד צוות/אודות/ניהול), לינקדאין, רשם החברות, Duns100, CheckID, חדשות עסקיות.

החזר JSON בלבד (בלי שום טקסט לפני או אחרי):
{
  "organization": {
    "name": "השם הרשמי מרשם החברות",
    "type": "סוג",
    "businessId": "ח.פ.",
    "phone": "טלפון",
    "email": "אימייל",
    "address": "כתובת",
    "website": "https://...",
    "contactTypes": ["ספק"],
    "disciplines": ["אדריכלות"],
    "notes": "תיאור"
  },
  "contacts": [
    {
      "firstName": "שם",
      "lastName": "משפחה",
      "phone": "נייד",
      "email": "אימייל",
      "role": "תפקיד",
      "linkedIn": "https://linkedin.com/in/...",
      "contactTypes": ["ספק"],
      "disciplines": ["אדריכלות"],
      "notes": "מידע נוסף"
    }
  ],
  "confidence": 0.9,
  "source": "רשימת מקורות"
}

חשוב: אל תמציא! אם אין מידע - רשום null. אבל השתדל למצוא כמה שיותר.`

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              tools: [{ google_search: {} }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192
              }
            })
          }
        )

        if (!response.ok) {
          console.error('Gemini API error:', await response.text())
          enrichedResults.push({
            originalLine: org.originalLine,
            name: org.name,
            confidence: 0,
            error: 'שגיאה בחיפוש'
          })
          continue
        }

        const data = await response.json()
        
        let text = ''
        if (data.candidates?.[0]?.content?.parts) {
          for (const part of data.candidates[0].content.parts) {
            if (part.text) text += part.text
          }
        }

        if (!text) {
          enrichedResults.push({
            originalLine: org.originalLine,
            name: org.name,
            confidence: 0,
            error: 'לא התקבלה תשובה'
          })
          continue
        }

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          enrichedResults.push({
            originalLine: org.originalLine,
            name: org.name,
            confidence: 0,
            error: 'לא נמצא מידע מובנה'
          })
          continue
        }

        try {
          const enriched = JSON.parse(jsonMatch[0])
          enrichedResults.push({
            originalLine: org.originalLine,
            organization: enriched.organization || {},
            contacts: enriched.contacts || [],
            confidence: enriched.confidence || 0.5,
            source: enriched.source || null
          })
        } catch (parseError) {
          enrichedResults.push({
            originalLine: org.originalLine,
            name: org.name,
            confidence: 0,
            error: 'שגיאה בפענוח'
          })
        }
      } catch (err) {
        enrichedResults.push({
          originalLine: org.originalLine,
          name: org.name,
          confidence: 0,
          error: err instanceof Error ? err.message : 'שגיאה'
        })
      }
    }

    return NextResponse.json({ enriched: enrichedResults })
  } catch (error) {
    console.error('Enrich error:', error)
    return NextResponse.json({ error: 'שגיאה בהעשרת נתונים' }, { status: 500 })
  }
}
