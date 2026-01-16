import { GoogleGenerativeAI } from '@google/generative-ai';

// ================================================
// WDI ERP - Gemini Configuration
// Version: 20260116-103000
// Changes: Added Vehicles Extended (9 functions): Documents, Photos, TollRoads, Parking, Assignments
// ================================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// הגדרת הפונקציות שה-LLM יכול לקרוא
export const agentFunctions: any[] = [
  // ============ EMPLOYEES ============
  {
    name: 'getEmployees',
    description: 'מחזיר רשימת עובדים עם אפשרות סינון לפי סטטוס, מחלקה או תפקיד. סטטוס יכול להיות בעברית (פעיל/לא פעיל) או אנגלית (active/inactive)',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס העובד: פעיל, לא פעיל, active, inactive, או all' },
        department: { type: 'STRING', description: 'שם המחלקה לסינון' },
        role: { type: 'STRING', description: 'תפקיד לסינון' },
      },
    },
  },
  {
    name: 'getEmployeeById',
    description: 'מחזיר פרטים מלאים של עובד ספציפי לפי שם, כולל: השכלה, הכשרות, ילדים, בן/בת זוג, סיווג ביטחוני',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: { type: 'STRING', description: 'שם העובד' },
      },
      required: ['searchTerm'],
    },
  },
  {
    name: 'countEmployees',
    description: 'ספירת עובדים לפי קריטריונים',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס: פעיל, לא פעיל, או all' },
        groupBy: { type: 'STRING', description: 'קיבוץ: department, role, employmentType' },
      },
    },
  },
  {
    name: 'getEmployeesStats',
    description: 'סטטיסטיקות עובדים',
    parameters: { type: 'OBJECT', properties: { status: { type: 'STRING' } } },
  },
  {
    name: 'getUpcomingBirthdays',
    description: 'ימי הולדת עובדים קרובים',
    parameters: { type: 'OBJECT', properties: { days: { type: 'NUMBER', description: 'ימים קדימה (ברירת מחדל: 30)' } } },
  },
  {
    name: 'getChildrenBirthdays',
    description: 'ימי הולדת ילדי עובדים קרובים',
    parameters: { type: 'OBJECT', properties: { days: { type: 'NUMBER', description: 'ימים קדימה (ברירת מחדל: 30)' } } },
  },
  {
    name: 'countEmployeesByEducation',
    description: 'ספירת עובדים לפי השכלה (תואר, מוסד, תחום)',
    parameters: {
      type: 'OBJECT',
      properties: {
        degree: { type: 'STRING', description: 'סוג תואר' },
        institution: { type: 'STRING', description: 'מוסד לימודים' },
        field: { type: 'STRING', description: 'תחום לימוד' },
      },
    },
  },
  {
    name: 'countEmployeesByCertification',
    description: 'ספירת עובדים לפי הכשרות ותעודות',
    parameters: {
      type: 'OBJECT',
      properties: {
        certification: { type: 'STRING', description: 'שם ההכשרה' },
        issuer: { type: 'STRING', description: 'הגוף המנפיק' },
      },
    },
  },
  {
    name: 'getEmployeesByClearance',
    description: 'עובדים לפי סיווג ביטחוני',
    parameters: {
      type: 'OBJECT',
      properties: {
        clearanceLevel: { type: 'NUMBER', description: 'רמה ספציפית (1-5)' },
        minLevel: { type: 'NUMBER', description: 'רמה מינימלית' },
      },
    },
  },
  // ============ PROJECTS ============
  {
    name: 'getProjects',
    description: 'רשימת פרויקטים עם סינון. מצב: פעיל/הושלם/מושהה/בוטל',
    parameters: {
      type: 'OBJECT',
      properties: {
        state: { type: 'STRING', description: 'מצב: פעיל, הושלם, מושהה, בוטל, או all' },
        category: { type: 'STRING', description: 'קטגוריה' },
        phase: { type: 'STRING', description: 'שלב' },
        managerName: { type: 'STRING', description: 'שם מנהל' },
      },
    },
  },
  {
    name: 'getProjectById',
    description: 'פרטים מלאים של פרויקט',
    parameters: {
      type: 'OBJECT',
      properties: { searchTerm: { type: 'STRING', description: 'שם או מספר פרויקט' } },
      required: ['searchTerm'],
    },
  },
  {
    name: 'getProjectEvents',
    description: 'אירועים של פרויקט',
    parameters: {
      type: 'OBJECT',
      properties: {
        projectName: { type: 'STRING', description: 'שם הפרויקט' },
        eventType: { type: 'STRING', description: 'סוג אירוע' },
        limit: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'getProjectContacts',
    description: 'אנשי קשר של פרויקט',
    parameters: {
      type: 'OBJECT',
      properties: { projectName: { type: 'STRING', description: 'שם הפרויקט' } },
    },
  },
  {
    name: 'countProjects',
    description: 'ספירת פרויקטים',
    parameters: {
      type: 'OBJECT',
      properties: {
        state: { type: 'STRING' },
        groupBy: { type: 'STRING', description: 'קיבוץ: category, phase, state' },
      },
    },
  },
  {
    name: 'getProjectsStats',
    description: 'סטטיסטיקות פרויקטים',
    parameters: { type: 'OBJECT', properties: { state: { type: 'STRING' }, category: { type: 'STRING' } } },
  },
  {
    name: 'getProjectLeads',
    description: 'מנהלי פרויקטים וכמה פרויקטים לכל אחד',
    parameters: { type: 'OBJECT', properties: { state: { type: 'STRING' } } },
  },
  // ============ EVENTS ============
  {
    name: 'searchEvents',
    description: 'חיפוש בתוכן אירועים ומיילים',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'מילות חיפוש' },
        eventType: { type: 'STRING' },
        projectName: { type: 'STRING' },
        daysBack: { type: 'NUMBER', description: 'ימים אחורה (ברירת מחדל: 90)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getRecentEvents',
    description: 'אירועים אחרונים',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: { type: 'NUMBER', description: 'ימים אחורה (ברירת מחדל: 7)' },
        eventType: { type: 'STRING' },
        limit: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'searchFileContents',
    description: 'חיפוש בתוכן קבצים מצורפים',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'מילות חיפוש' },
        projectName: { type: 'STRING' },
        fileType: { type: 'STRING', description: 'סוג: pdf, docx, xlsx' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getFileSummary',
    description: 'תוכן קובץ מצורף',
    parameters: {
      type: 'OBJECT',
      properties: { fileId: { type: 'STRING' } },
      required: ['fileId'],
    },
  },
  // ============ CONTACTS & ORGANIZATIONS ============
  {
    name: 'getContacts',
    description: 'רשימת אנשי קשר',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING' },
        discipline: { type: 'STRING' },
        contactType: { type: 'STRING', description: 'סוג: ספק, יועץ, קבלן, לקוח, רשות' },
      },
    },
  },
  {
    name: 'getContactById',
    description: 'פרטי איש קשר',
    parameters: { type: 'OBJECT', properties: { searchTerm: { type: 'STRING' } }, required: ['searchTerm'] },
  },
  {
    name: 'getContactsByDiscipline',
    description: 'אנשי קשר לפי דיסציפלינה',
    parameters: { type: 'OBJECT', properties: { discipline: { type: 'STRING' } }, required: ['discipline'] },
  },
  {
    name: 'countContacts',
    description: 'ספירת אנשי קשר',
    parameters: { type: 'OBJECT', properties: { groupBy: { type: 'STRING' } } },
  },
  {
    name: 'getOrganizations',
    description: 'רשימת ארגונים',
    parameters: { type: 'OBJECT', properties: { isVendor: { type: 'BOOLEAN' }, type: { type: 'STRING' } } },
  },
  {
    name: 'getOrganizationById',
    description: 'פרטי ארגון',
    parameters: { type: 'OBJECT', properties: { searchTerm: { type: 'STRING' } }, required: ['searchTerm'] },
  },
  // ============ VENDOR RATINGS ============
  {
    name: 'getVendorRatings',
    description: 'דירוגי ספקים/יועצים',
    parameters: {
      type: 'OBJECT',
      properties: {
        organizationName: { type: 'STRING' },
        contactName: { type: 'STRING' },
        projectName: { type: 'STRING' },
        minRating: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'getTopRatedVendors',
    description: 'ספקים עם הדירוג הגבוה',
    parameters: { type: 'OBJECT', properties: { discipline: { type: 'STRING' }, limit: { type: 'NUMBER' } } },
  },
  {
    name: 'getVendorRatingStats',
    description: 'סטטיסטיקות דירוגים',
    parameters: { type: 'OBJECT', properties: {} },
  },
  // ============ EQUIPMENT ============
  {
    name: 'getEquipment',
    description: 'רשימת ציוד. סוג בעברית (מחשב נייד, מסך) או אנגלית (LAPTOP, MONITOR). סטטוס: פעיל/ACTIVE, בתיקון/IN_REPAIR',
    parameters: {
      type: 'OBJECT',
      properties: {
        type: { type: 'STRING', description: 'סוג: מחשב נייד/LAPTOP, מסך/MONITOR, מטען/CHARGER וכו\'' },
        status: { type: 'STRING', description: 'סטטוס: פעיל/ACTIVE, בתיקון/IN_REPAIR, נמכר/SOLD, אבד/LOST' },
        employeeName: { type: 'STRING', description: 'עובד משויך' },
        isOfficeEquipment: { type: 'BOOLEAN', description: 'ציוד משרדי בלבד' },
      },
    },
  },
  {
    name: 'getEquipmentById',
    description: 'פרטי ציוד לפי מספר סריאלי או דגם',
    parameters: { type: 'OBJECT', properties: { searchTerm: { type: 'STRING' } }, required: ['searchTerm'] },
  },
  {
    name: 'getEquipmentByEmployee',
    description: 'ציוד של עובד',
    parameters: { type: 'OBJECT', properties: { employeeName: { type: 'STRING' } }, required: ['employeeName'] },
  },
  {
    name: 'countEquipment',
    description: 'ספירת ציוד',
    parameters: { type: 'OBJECT', properties: { groupBy: { type: 'STRING' }, status: { type: 'STRING' } } },
  },
  {
    name: 'getEquipmentNeedingWarrantyRenewal',
    description: 'ציוד שהאחריות עומדת לפוג',
    parameters: { type: 'OBJECT', properties: { days: { type: 'NUMBER', description: 'ימים קדימה (ברירת מחדל: 30)' } } },
  },
  {
    name: 'getEquipmentStats',
    description: 'סטטיסטיקות ציוד',
    parameters: { type: 'OBJECT', properties: {} },
  },
  // ============ VEHICLES - BASIC ============
  {
    name: 'getVehicles',
    description: 'רשימת רכבים. סטטוס בעברית (פעיל/בטיפול) או אנגלית (ACTIVE/IN_SERVICE)',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס: פעיל/ACTIVE, בטיפול/IN_SERVICE, הוחזר/RETURNED, נמכר/SOLD' },
        manufacturer: { type: 'STRING' },
        contractType: { type: 'STRING', description: 'השכרה/RENTAL או ליסינג/LEASING' },
      },
    },
  },
  {
    name: 'getVehicleById',
    description: 'פרטים מלאים של רכב: נהג, תדלוקים, טיפולים, תאונות, דוחות',
    parameters: { type: 'OBJECT', properties: { licensePlate: { type: 'STRING' } }, required: ['licensePlate'] },
  },
  {
    name: 'getVehicleByDriver',
    description: 'הרכב של עובד',
    parameters: { type: 'OBJECT', properties: { employeeName: { type: 'STRING' } }, required: ['employeeName'] },
  },
  {
    name: 'getVehicleFuelLogs',
    description: 'תדלוקים של רכב',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING' },
        daysBack: { type: 'NUMBER', description: 'ימים אחורה (ברירת מחדל: 30)' },
      },
    },
  },
  {
    name: 'getVehicleServices',
    description: 'טיפולים של רכב',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING' },
        upcoming: { type: 'BOOLEAN' },
        daysBack: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'getVehicleAccidents',
    description: 'תאונות רכב. סטטוס בעברית (פתוח/בטיפול/סגור)',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING' },
        status: { type: 'STRING', description: 'פתוח, בטיפול, סגור' },
        daysBack: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'getVehicleTickets',
    description: 'דוחות תנועה. סטטוס: ממתין/PENDING, שולם/PAID, בערעור/APPEALED, בוטל/CANCELLED',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING' },
        status: { type: 'STRING', description: 'ממתין/PENDING, שולם/PAID, בערעור/APPEALED, בוטל/CANCELLED' },
        daysBack: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'countVehicles',
    description: 'ספירת רכבים',
    parameters: { type: 'OBJECT', properties: { groupBy: { type: 'STRING' }, status: { type: 'STRING' } } },
  },
  {
    name: 'getVehiclesStats',
    description: 'סטטיסטיקות צי רכב',
    parameters: { type: 'OBJECT', properties: { status: { type: 'STRING' } } },
  },
  {
    name: 'getVehiclesNeedingService',
    description: 'רכבים שצריכים טיפול',
    parameters: {
      type: 'OBJECT',
      properties: {
        daysAhead: { type: 'NUMBER', description: 'ימים קדימה (ברירת מחדל: 30)' },
        kmThreshold: { type: 'NUMBER', description: 'ק"מ לפני טיפול (ברירת מחדל: 1000)' },
      },
    },
  },
  // ============ VEHICLES - EXTENDED (NEW!) ============
  {
    name: 'getVehicleDocuments',
    description: 'מסמכי רכב: רישיון/LICENSE, ביטוח/INSURANCE, בדיקת חורף/WINTER_CHECK',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING', description: 'מספר רישוי (ריק = כל הרכבים)' },
        type: { type: 'STRING', description: 'סוג: רישיון/LICENSE, ביטוח/INSURANCE, בדיקת חורף/WINTER_CHECK' },
        expiringInDays: { type: 'NUMBER', description: 'מסמכים שפגים בתוך X ימים' },
      },
    },
  },
  {
    name: 'getVehiclesWithExpiringDocuments',
    description: 'רכבים עם מסמכים שפגו או עומדים לפוג (ביטוח, רישיון, בדיקת חורף)',
    parameters: {
      type: 'OBJECT',
      properties: {
        daysAhead: { type: 'NUMBER', description: 'ימים קדימה (ברירת מחדל: 30)' },
        includeExpired: { type: 'BOOLEAN', description: 'כולל מסמכים שכבר פגו' },
      },
    },
  },
  {
    name: 'getVehiclePhotos',
    description: 'תמונות רכב. סוג אירוע: קבלה/HANDOVER_IN, מסירה/HANDOVER_OUT, תאונה/ACCIDENT',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING' },
        eventType: { type: 'STRING', description: 'קבלה/HANDOVER_IN, מסירה/HANDOVER_OUT, תאונה/ACCIDENT, טיפול/SERVICE, כללי/GENERAL' },
        photoType: { type: 'STRING', description: 'חזית/FRONT, אחור/REAR, ימין/RIGHT_SIDE, שמאל/LEFT_SIDE, פנים/INTERIOR' },
        limit: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'getVehicleHandoverPhotos',
    description: 'תמונות מסירה/קבלה של רכב, מקובץ לפי עובד',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING', description: 'מספר רישוי (חובה)' },
        handoverType: { type: 'STRING', description: 'in (קבלה), out (מסירה), both (שניהם)' },
      },
      required: ['licensePlate'],
    },
  },
  {
    name: 'getVehicleTollRoads',
    description: 'נסיעות כביש אגרה (כביש 6, מנהרות הכרמל)',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING', description: 'מספר רישוי (ריק = כל הרכבים)' },
        daysBack: { type: 'NUMBER', description: 'ימים אחורה (ברירת מחדל: 30)' },
        road: { type: 'STRING', description: 'כביש לסינון (כביש 6)' },
        employeeName: { type: 'STRING' },
      },
    },
  },
  {
    name: 'getTollRoadStats',
    description: 'סטטיסטיקות הוצאות כביש אגרה',
    parameters: {
      type: 'OBJECT',
      properties: {
        daysBack: { type: 'NUMBER', description: 'ימים אחורה (ברירת מחדל: 90)' },
        groupBy: { type: 'STRING', description: 'קיבוץ: vehicle, employee, road, month' },
      },
    },
  },
  {
    name: 'getVehicleParkings',
    description: 'חניות',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING' },
        daysBack: { type: 'NUMBER', description: 'ימים אחורה (ברירת מחדל: 30)' },
        location: { type: 'STRING', description: 'מיקום/חניון' },
        employeeName: { type: 'STRING' },
      },
    },
  },
  {
    name: 'getParkingStats',
    description: 'סטטיסטיקות הוצאות חניה',
    parameters: {
      type: 'OBJECT',
      properties: {
        daysBack: { type: 'NUMBER', description: 'ימים אחורה (ברירת מחדל: 90)' },
        groupBy: { type: 'STRING', description: 'קיבוץ: vehicle, employee, location, month' },
      },
    },
  },
  {
    name: 'getVehicleAssignments',
    description: 'היסטוריית שיוכי רכב לעובדים',
    parameters: {
      type: 'OBJECT',
      properties: {
        licensePlate: { type: 'STRING' },
        employeeName: { type: 'STRING' },
        current: { type: 'BOOLEAN', description: 'רק שיוכים פעילים' },
      },
    },
  },
  // ============ GENERAL ============
  {
    name: 'searchAll',
    description: 'חיפוש חופשי בעובדים, פרויקטים ואירועים',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] },
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
2. **טבלאות** - כשיש רשימה של פריטים (יותר מ-2), הצג בטבלת Markdown
3. **רשימות** - השתמש ב-bullet points
4. **הדגשות** - השתמש ב-**bold** לדברים חשובים
5. **מספרים** - הצג עם מפריד אלפים (1,000,000) ומטבע ₪
6. **תאריכים** - הצג בפורמט DD/MM/YYYY

## נורמליזציה - חשוב!
המשתמש יכול לכתוב סטטוסים בעברית או אנגלית, יחיד או רבים:
- "פעילים" = "פעיל" = "active" = "ACTIVE"
- "מחשבים ניידים" = "מחשב נייד" = "laptop" = "LAPTOP"
- "ביטוח" = "insurance" = "INSURANCE"
הפונקציות מטפלות בתרגום אוטומטית.

## פונקציות זמינות:

### עובדים:
- getEmployees, getEmployeeById, countEmployees, getEmployeesStats
- getUpcomingBirthdays, getChildrenBirthdays
- countEmployeesByEducation, countEmployeesByCertification, getEmployeesByClearance

### פרויקטים:
- getProjects, getProjectById, countProjects, getProjectsStats
- getProjectEvents, getProjectContacts, getProjectLeads

### אירועים:
- searchEvents, getRecentEvents, searchFileContents, getFileSummary

### אנשי קשר:
- getContacts, getContactById, getContactsByDiscipline, countContacts
- getOrganizations, getOrganizationById

### ציוד:
- getEquipment, getEquipmentById, getEquipmentByEmployee
- countEquipment, getEquipmentStats, getEquipmentNeedingWarrantyRenewal

### רכבים - בסיסי:
- getVehicles, getVehicleById, getVehicleByDriver
- getVehicleFuelLogs, getVehicleServices
- getVehicleAccidents, getVehicleTickets
- countVehicles, getVehiclesStats, getVehiclesNeedingService

### רכבים - מורחב (חדש!):
- **getVehicleDocuments** - מסמכי רכב (רישיון, ביטוח, בדיקת חורף)
- **getVehiclesWithExpiringDocuments** - רכבים עם מסמכים שפגו/עומדים לפוג
- **getVehiclePhotos** - תמונות רכב
- **getVehicleHandoverPhotos** - תמונות מסירה/קבלה
- **getVehicleTollRoads** - נסיעות כביש אגרה
- **getTollRoadStats** - סטטיסטיקות כביש אגרה
- **getVehicleParkings** - חניות
- **getParkingStats** - סטטיסטיקות חניה
- **getVehicleAssignments** - היסטוריית שיוכי רכב

### דירוגי ספקים:
- getVendorRatings, getTopRatedVendors, getVendorRatingStats

### כללי:
- searchAll

## כללים:
- לשאלות על תוקף ביטוח/רישיון - השתמש ב-getVehicleDocuments או getVehiclesWithExpiringDocuments
- לשאלות על תמונות רכב - השתמש ב-getVehiclePhotos או getVehicleHandoverPhotos
- לשאלות על הוצאות כביש 6 - השתמש ב-getVehicleTollRoads או getTollRoadStats
- לשאלות על הוצאות חניה - השתמש ב-getVehicleParkings או getParkingStats
- אל תמציא מידע שלא קיבלת מהפונקציות!
`,
  });
}

export { genAI };
