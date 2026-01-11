import { GoogleGenerativeAI } from '@google/generative-ai';

// ================================================
// WDI ERP - Gemini Configuration
// Version: 20260111-180400
// Changes: Added vehicles functions, searchFileContents, getFileSummary
// ================================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// הגדרת הפונקציות שה-LLM יכול לקרוא
export const agentFunctions: any[] = [
  {
    name: 'getEmployees',
    description: 'מחזיר רשימת עובדים עם אפשרות סינון לפי סטטוס, מחלקה או תפקיד',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס העובד: פעיל, לא פעיל, או all' },
        department: { type: 'STRING', description: 'שם המחלקה לסינון' },
        role: { type: 'STRING', description: 'תפקיד לסינון' },
      },
    },
  },
  {
    name: 'getEmployeeById',
    description: 'מחזיר פרטים מלאים של עובד ספציפי לפי שם או תעודת זהות, כולל: פרטים אישיים, כתובת, לינקדאין, אימייל אישי, סיווג ביטחוני, פרטי בן/בת זוג, ילדים, השכלה אקדמית, הכשרות ותעודות, ופרויקטים משויכים',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: { type: 'STRING', description: 'שם העובד או מספר תעודת זהות' },
      },
      required: ['searchTerm'],
    },
  },
  {
    name: 'getProjects',
    description: 'מחזיר רשימת פרויקטים עם אפשרות סינון לפי סטטוס, קטגוריה, שלב או מנהל',
    parameters: {
      type: 'OBJECT',
      properties: {
        state: { type: 'STRING', description: 'מצב הפרויקט: פעיל, הושלם, מושהה, בוטל, או all' },
        category: { type: 'STRING', description: 'קטגוריה: מגורים, משרדים, תעשייה, ציבורי, ביטחוני, תשתיות, אחר' },
        phase: { type: 'STRING', description: 'שלב: ייזום, תכנון מפורט, תכנון למכרזים, מכרזים, ביצוע, מסירה/אחריות' },
        leadId: { type: 'STRING', description: 'מזהה מנהל הפרויקט' },
        managerName: { type: 'STRING', description: 'שם מנהל הפרויקט לחיפוש' },
      },
    },
  },
  {
    name: 'getProjectById',
    description: 'מחזיר פרטים מלאים של פרויקט ספציפי כולל: כתובת, תיאור, שירותים, סוגי מבנים, שיטות מסירה, תאריך סיום, אנשי קשר ואירועים אחרונים',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: { type: 'STRING', description: 'שם הפרויקט או מספר פרויקט' },
      },
      required: ['searchTerm'],
    },
  },
  {
    name: 'getProjectEvents',
    description: 'מחזיר אירועים מיומן האירועים של פרויקט',
    parameters: {
      type: 'OBJECT',
      properties: {
        projectId: { type: 'STRING', description: 'מזהה הפרויקט' },
        projectName: { type: 'STRING', description: 'שם הפרויקט לחיפוש' },
        eventType: { type: 'STRING', description: 'סוג אירוע: אתגר, תיעוד, החלטה, לקוח, בטיחות, סיכום פגישה, אדמיניסטרציה, גבייה, מייל, אחר' },
        limit: { type: 'NUMBER', description: 'מספר אירועים מקסימלי להחזיר' },
      },
    },
  },
  {
    name: 'getProjectContacts',
    description: 'מחזיר אנשי קשר של פרויקט ספציפי',
    parameters: {
      type: 'OBJECT',
      properties: {
        projectId: { type: 'STRING', description: 'מזהה הפרויקט' },
        projectName: { type: 'STRING', description: 'שם הפרויקט לחיפוש' },
      },
    },
  },
  {
    name: 'countEmployees',
    description: 'מחזיר ספירת עובדים לפי קריטריונים שונים',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס לספירה: פעיל, לא פעיל, או all' },
        groupBy: { type: 'STRING', description: 'שדה לקיבוץ: department, role, employmentType' },
      },
    },
  },
  {
    name: 'countProjects',
    description: 'מחזיר ספירת פרויקטים לפי קריטריונים שונים',
    parameters: {
      type: 'OBJECT',
      properties: {
        state: { type: 'STRING', description: 'מצב לספירה: פעיל, הושלם, או all' },
        groupBy: { type: 'STRING', description: 'שדה לקיבוץ: category, phase, state' },
      },
    },
  },
  {
    name: 'getUpcomingBirthdays',
    description: 'מחזיר ימי הולדת קרובים של עובדים',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: { type: 'NUMBER', description: 'מספר ימים קדימה לבדיקה (ברירת מחדל: 30)' },
      },
    },
  },
  {
    name: 'getChildrenBirthdays',
    description: 'מחזיר ימי הולדת קרובים של ילדי העובדים',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: { type: 'NUMBER', description: 'מספר ימים קדימה לבדיקה (ברירת מחדל: 30)' },
      },
    },
  },
  {
    name: 'searchAll',
    description: 'חיפוש חופשי בכל המערכת - עובדים, פרויקטים ואירועים (כולל מיילים)',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'מחרוזת חיפוש' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getProjectsStats',
    description: 'מחזיר סטטיסטיקות על פרויקטים: סכום עלויות, ממוצעים, פילוח לפי קטגוריה, רשימת מנהלים',
    parameters: {
      type: 'OBJECT',
      properties: {
        state: { type: 'STRING', description: 'מצב הפרויקט לסינון: פעיל, הושלם, או all' },
        category: { type: 'STRING', description: 'קטגוריה לסינון' },
      },
    },
  },
  {
    name: 'getEmployeesStats',
    description: 'מחזיר סטטיסטיקות על עובדים: ממוצע גילאים, פילוח לפי תפקיד ומחלקה, סה"כ שכר',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס לסינון: פעיל, לא פעיל, או all' },
      },
    },
  },
  {
    name: 'getRecentEvents',
    description: 'מחזיר אירועים אחרונים מכל הפרויקטים לפי תקופה',
    parameters: {
      type: 'OBJECT',
      properties: {
        daysBack: { type: 'NUMBER', description: 'כמה ימים אחורה לחפש (ברירת מחדל: 7)' },
        eventType: { type: 'STRING', description: 'סוג אירוע לסינון (כולל: מייל)' },
        limit: { type: 'NUMBER', description: 'מספר אירועים מקסימלי' },
      },
    },
  },
  {
    name: 'getProjectLeads',
    description: 'מחזיר רשימת מנהלי/מובילי פרויקטים',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getContacts',
    description: 'מחזיר רשימת אנשי קשר (ספקים, יועצים, אדריכלים וכו) עם אפשרות סינון לפי דיסציפלינה, סוג קשר או ארגון',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס: פעיל, לא פעיל, או all' },
        discipline: { type: 'STRING', description: 'דיסציפלינה: אדריכלות, הנדסת מבנים, חשמל, אינסטלציה, מיזוג אוויר וכו' },
        contactType: { type: 'STRING', description: 'סוג קשר: ספק, יועץ, קבלן, לקוח, רשות' },
        organizationName: { type: 'STRING', description: 'שם הארגון לסינון' },
      },
    },
  },
  {
    name: 'getContactsByDiscipline',
    description: 'מחזיר אנשי קשר לפי דיסציפלינה ספציפית (אדריכלים, מהנדסים וכו)',
    parameters: {
      type: 'OBJECT',
      properties: {
        discipline: { type: 'STRING', description: 'הדיסציפלינה לחיפוש: אדריכלות, הנדסת מבנים, חשמל וכו' },
      },
      required: ['discipline'],
    },
  },
  {
    name: 'countContacts',
    description: 'מחזיר ספירת אנשי קשר',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס לספירה' },
      },
    },
  },
  {
    name: 'getOrganizations',
    description: 'מחזיר רשימת ארגונים (משרדים, חברות) עם פרטים מלאים: ח.פ., כתובת, אתר, הערות, ומספר אנשי הקשר',
    parameters: {
      type: 'OBJECT',
      properties: {
        type: { type: 'STRING', description: 'סוג ארגון: חברה פרטית, חברה ציבורית, עמותה, רשות' },
        isVendor: { type: 'BOOLEAN', description: 'האם ספק' },
      },
    },
  },
  {
    name: 'getContactById',
    description: 'מחזיר פרטים מלאים של איש קשר ספציפי כולל תאריך לידה והערות',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: { type: 'STRING', description: 'שם איש הקשר או טלפון' },
      },
      required: ['searchTerm'],
    },
  },
  {
    name: 'getOrganizationById',
    description: 'מחזיר פרטים מלאים של ארגון ספציפי כולל ח.פ., כתובת, אתר והערות',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: { type: 'STRING', description: 'שם הארגון' },
      },
      required: ['searchTerm'],
    },
  },
  {
    name: 'searchEvents',
    description: 'חיפוש חופשי בתוכן אירועים ומיילים מתויקים לפי מילות מפתח. משמש לחיפוש בתוך תוכן מיילים שנשמרו במערכת, החלטות, סיכומי פגישות וכו',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'מחרוזת חיפוש בתוכן האירוע או המייל' },
        eventType: { type: 'STRING', description: 'סוג אירוע לסינון: מייל, אתגר, תיעוד, החלטה, לקוח, בטיחות, סיכום פגישה, אדמיניסטרציה, גבייה, אחר' },
        projectName: { type: 'STRING', description: 'שם פרויקט לסינון' },
        daysBack: { type: 'NUMBER', description: 'כמה ימים אחורה לחפש' },
        limit: { type: 'NUMBER', description: 'מספר תוצאות מקסימלי' },
      },
      required: ['query'],
    },
  },
  // === VENDOR RATING FUNCTIONS ===
  {
    name: 'getVendorRatings',
    description: 'מחזיר דירוגי ספקים/יועצים. ניתן לסנן לפי ארגון, איש קשר, או פרויקט',
    parameters: {
      type: 'OBJECT',
      properties: {
        organizationName: { type: 'STRING', description: 'שם הארגון/המשרד לחיפוש' },
        contactName: { type: 'STRING', description: 'שם איש הקשר לחיפוש' },
        projectName: { type: 'STRING', description: 'שם הפרויקט לסינון' },
        minRating: { type: 'NUMBER', description: 'דירוג מינימלי (1-5)' },
      },
    },
  },
  {
    name: 'getTopRatedVendors',
    description: 'מחזיר את הספקים/יועצים עם הדירוג הגבוה ביותר',
    parameters: {
      type: 'OBJECT',
      properties: {
        discipline: { type: 'STRING', description: 'דיסציפלינה לסינון: אדריכלות, הנדסת מבנים, חשמל וכו' },
        limit: { type: 'NUMBER', description: 'מספר תוצאות מקסימלי (ברירת מחדל: 10)' },
      },
    },
  },
  {
    name: 'getVendorRatingStats',
    description: 'מחזיר סטטיסטיקות דירוגים: ממוצעים, פילוח לפי דיסציפלינה, מספר דירוגים',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  // === VEHICLES FUNCTIONS ===
  {
    name: 'getVehicles',
    description: 'מחזיר רשימת רכבים עם אפשרות סינון לפי סטטוס, יצרן או סוג חוזה',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס: ACTIVE, INACTIVE, IN_SERVICE, SOLD, או all' },
        manufacturer: { type: 'STRING', description: 'יצרן הרכב' },
        contractType: { type: 'STRING', description: 'סוג חוזה: LEASING, RENTAL, OWNED' },
      },
    },
  },
  {
    name: 'getVehicleById',
    description: 'מחזיר פרטים מלאים של רכב ספציפי לפי מספר רישוי, כולל: נהג נוכחי, היסטוריית שיוכים, תדלוקים, טיפולים, תאונות, דוחות וכו',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: { type: 'STRING', description: 'מספר רישוי או חלק ממנו' },
      },
      required: ['searchTerm'],
    },
  },
  {
    name: 'getVehicleByDriver',
    description: 'מחזיר את הרכב המשויך לעובד ספציפי',
    parameters: {
      type: 'OBJECT',
      properties: {
        driverName: { type: 'STRING', description: 'שם הנהג/עובד' },
      },
      required: ['driverName'],
    },
  },
  {
    name: 'getVehicleFuelLogs',
    description: 'מחזיר היסטוריית תדלוקים של רכב',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING', description: 'מספר רישוי' },
        daysBack: { type: 'NUMBER', description: 'כמה ימים אחורה (ברירת מחדל: 30)' },
        limit: { type: 'NUMBER', description: 'מספר תוצאות מקסימלי' },
      },
    },
  },
  {
    name: 'getVehicleServices',
    description: 'מחזיר היסטוריית טיפולים של רכב',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING', description: 'מספר רישוי' },
        limit: { type: 'NUMBER', description: 'מספר תוצאות מקסימלי' },
      },
    },
  },
  {
    name: 'getVehicleAccidents',
    description: 'מחזיר תאונות של רכב',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING', description: 'מספר רישוי' },
        status: { type: 'STRING', description: 'סטטוס: פתוח, סגור, או all' },
      },
    },
  },
  {
    name: 'getVehicleTickets',
    description: 'מחזיר דוחות תנועה של רכב',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING', description: 'מספר רישוי' },
        status: { type: 'STRING', description: 'סטטוס: ממתין לתשלום, שולם, בערעור, או all' },
      },
    },
  },
  {
    name: 'countVehicles',
    description: 'מחזיר ספירת רכבים לפי קריטריונים',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס לספירה' },
        groupBy: { type: 'STRING', description: 'שדה לקיבוץ: manufacturer, contractType, status' },
      },
    },
  },
  {
    name: 'getVehiclesStats',
    description: 'מחזיר סטטיסטיקות צי רכב: סה"כ עלויות, ממוצע צריכת דלק, רכבים לטיפול קרוב',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getVehiclesNeedingService',
    description: 'מחזיר רכבים שצריכים טיפול בקרוב (לפי תאריך או ק"מ)',
    parameters: {
      type: 'OBJECT',
      properties: {
        daysAhead: { type: 'NUMBER', description: 'כמה ימים קדימה לבדוק (ברירת מחדל: 30)' },
      },
    },
  },
  // File Content Search - חיפוש בתוכן קבצים
  {
    name: 'searchFileContents',
    description: 'חיפוש בתוכן קבצים מצורפים לאירועים (PDF, PPTX, DOCX). משמש כשהמשתמש שואל על תוכן מסמכים, מצגות, או סיכומי פגישות',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'מילות חיפוש בתוכן הקובץ' },
        projectId: { type: 'STRING', description: 'מזהה פרויקט להגבלת החיפוש (אופציונלי)' },
        projectName: { type: 'STRING', description: 'שם פרויקט להגבלת החיפוש (אופציונלי)' },
        eventType: { type: 'STRING', description: 'סוג אירוע להגבלת החיפוש (אופציונלי)' },
        limit: { type: 'NUMBER', description: 'מספר תוצאות מקסימלי (ברירת מחדל: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getFileSummary',
    description: 'מחזיר את התוכן המלא של קובץ מצורף לאירוע. משמש כשהמשתמש רוצה לקרוא או לסכם מסמך ספציפי',
    parameters: {
      type: 'OBJECT',
      properties: {
        fileId: { type: 'STRING', description: 'מזהה הקובץ' },
      },
      required: ['fileId'],
    },
  },
];

export function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 4096,
    },
    tools: [{ functionDeclarations: agentFunctions }],
    systemInstruction: `אתה עוזר וירטואלי של מערכת WDI ERP לניהול פרויקטי בנייה ותשתיות.

## כלל עליון - חובה!
**לעולם אל תמציא מידע!** 
- תמיד קרא לפונקציה המתאימה לפני שאתה עונה על שאלה
- אם הפונקציה מחזירה null או רשימה ריקה - אמור "לא נמצא במערכת" ואל תנחש
- אם אינך בטוח - שאל שאלה מבהירה

## כללי עיצוב התשובה:

1. **תמיד ענה בעברית** בצורה תמציתית וברורה

2. **טבלאות** - כשיש רשימה של פריטים (יותר מ-2), הצג בטבלת Markdown:
   | עמודה1 | עמודה2 |
   |---|---|
   | ערך1 | ערך2 |

3. **רשימות** - השתמש ב-bullet points:
   * פריט ראשון
   * פריט שני

4. **הדגשות** - השתמש ב-**bold** לדברים חשובים

5. **מספרים** - הצג עם מפריד אלפים (1,000,000) ומטבע ₪

6. **תאריכים** - הצג בפורמט DD/MM/YYYY

## פונקציות זמינות:

### עובדים:
- getEmployees - רשימת עובדים עם סינון
- getEmployeeById - פרטים מלאים של עובד (כולל: אימייל אישי, לינקדאין, סיווג ביטחוני, השכלה, הכשרות, תעודות, ילדים, בן/בת זוג)
- countEmployees - ספירת עובדים
- getEmployeesStats - סטטיסטיקות עובדים
- getUpcomingBirthdays - ימי הולדת עובדים קרובים
- getChildrenBirthdays - ימי הולדת ילדי עובדים

### פרויקטים:
- getProjects - רשימת פרויקטים עם סינון
- getProjectById - פרטים מלאים של פרויקט (כולל: כתובת, תיאור, שירותים, סוגי מבנים, שיטות מסירה)
- countProjects - ספירת פרויקטים
- getProjectsStats - סטטיסטיקות פרויקטים
- getProjectEvents - אירועים של פרויקט
- getProjectContacts - אנשי קשר של פרויקט
- getProjectLeads - מנהלי פרויקטים
- getRecentEvents - אירועים אחרונים

### אירועים ומיילים:
- searchEvents - **חיפוש בתוכן אירועים ומיילים** (חדש!)
- getRecentEvents - אירועים אחרונים לפי תקופה

### אנשי קשר וארגונים:
- getContacts - רשימת אנשי קשר
- getContactById - פרטים מלאים של איש קשר (כולל: תאריך לידה, הערות)
- getContactsByDiscipline - אנשי קשר לפי דיסציפלינה
- countContacts - ספירת אנשי קשר
- getOrganizations - רשימת ארגונים
- getOrganizationById - פרטים מלאים של ארגון (כולל: ח.פ., כתובת, אתר, הערות)

### רכבים:
- getVehicles - רשימת רכבים עם סינון
- getVehicleById - פרטים מלאים של רכב (נהג, תדלוקים, טיפולים, תאונות, דוחות)
- getVehicleByDriver - הרכב של עובד ספציפי
- getVehicleFuelLogs - היסטוריית תדלוקים
- getVehicleServices - היסטוריית טיפולים
- getVehicleAccidents - תאונות רכב
- getVehicleTickets - דוחות תנועה
- countVehicles - ספירת רכבים
- getVehiclesStats - סטטיסטיקות צי רכב
- getVehiclesNeedingService - רכבים שצריכים טיפול

### דירוגי ספקים:
- getVendorRatings - דירוגים של ספקים/יועצים (לפי ארגון, איש קשר, פרויקט)
- getTopRatedVendors - הספקים והיועצים עם הדירוג הגבוה ביותר
- getVendorRatingStats - סטטיסטיקות דירוגים

### כללי:
- searchAll - חיפוש חופשי (עובדים, פרויקטים, אירועים)

## כללים:
- השתמש בפונקציה המתאימה ביותר לשאלה
- לשאלות על סכומים/ממוצעים - השתמש בפונקציות Stats
- לשאלות על השכלה/תעודות/הכשרות של עובד - השתמש ב-getEmployeeById
- לשאלות על כתובת/תיאור פרויקט - השתמש ב-getProjectById
- **לשאלות על תוכן מיילים או אירועים** - השתמש ב-searchEvents
- **לשאלות על רכבים** - השתמש בפונקציות getVehicle*
- אל תמציא מידע שלא קיבלת מהפונקציות
`,
  });
}

export { genAI };
