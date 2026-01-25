import { GoogleGenerativeAI } from '@google/generative-ai';

// ================================================
// WDI ERP - Gemini Configuration
// Version: 20260124-STAGE63
// Stage 6.3 Remediation: Added Equipment, Users, ActivityLog functions
// R2: Guarded Analysis with Explicit Hedging
// R5: Explicit Uncertainty & Refusal Framework
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
  // NOTE: Photo functions removed - Agent is for data queries, not file viewing
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
  // ============ DATA DICTIONARY ============
  {
    name: 'getSchemaCatalog',
    description: 'מחזיר את כל מבנה הסכמה - ישויות ושדות במערכת. לשימוש בשאלות כמו "מה השדות של עובד?" או "מה יש במערכת?"',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'getFieldInfo',
    description: 'מידע על שדה ספציפי: סוג, ערכים אפשריים, תיאור. לשאלות כמו "מה זה status?" או "אילו סטטוסים יש?"',
    parameters: {
      type: 'OBJECT',
      properties: {
        entityName: { type: 'STRING', description: 'שם הישות: Employee, Project, Vehicle, Contact וכו\'' },
        fieldName: { type: 'STRING', description: 'שם השדה' },
      },
      required: ['entityName', 'fieldName'],
    },
  },
  {
    name: 'findFieldBySynonym',
    description: 'חיפוש שדה לפי מילה נרדפת. לשאלות כמו "מה זה משכורת?" או "איפה רואים ת.ז.?"',
    parameters: {
      type: 'OBJECT',
      properties: {
        synonym: { type: 'STRING', description: 'מילה לחיפוש: משכורת, ת.ז., טלפון וכו\'' },
      },
      required: ['synonym'],
    },
  },
  // ============ EDUCATION & CERTIFICATIONS ============
  {
    name: 'getEmployeesWithEducation',
    description: 'רשימת עובדים עם פרטי השכלה והכשרות. לשאלות על מהנדסים, הנדסאים, תארים, הכשרות, תעודות מקצועיות.',
    parameters: {
      type: 'OBJECT',
      properties: {
        degreeType: { type: 'STRING', description: 'סוג תואר: מהנדס, הנדסאי, תואר ראשון, תואר שני, MBA, B.Sc, M.Sc' },
        institution: { type: 'STRING', description: 'מוסד לימודים: טכניון, אוניברסיטה, מכללה' },
        certification: { type: 'STRING', description: 'הכשרה או תעודה מקצועית' },
        status: { type: 'STRING', description: 'סטטוס עובד (ברירת מחדל: פעיל)' },
      },
    },
  },
  // ============ STAGE 6.3: EQUIPMENT ============
  {
    name: 'getEquipment',
    description: 'רשימת ציוד עם סינון לפי סטטוס, סוג או יצרן',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס: ACTIVE, INACTIVE, MAINTENANCE, DISPOSED, או all' },
        type: { type: 'STRING', description: 'סוג ציוד' },
        manufacturer: { type: 'STRING', description: 'יצרן' },
        isOffice: { type: 'BOOLEAN', description: 'ציוד משרדי' },
      },
    },
  },
  {
    name: 'getEquipmentById',
    description: 'פרטי ציוד ספציפי לפי מזהה',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING', description: 'מזהה הציוד' },
      },
      required: ['id'],
    },
  },
  {
    name: 'countEquipment',
    description: 'ספירת ציוד לפי קריטריונים',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'סטטוס הציוד' },
        type: { type: 'STRING', description: 'סוג ציוד' },
      },
    },
  },
  {
    name: 'getEquipmentStats',
    description: 'סטטיסטיקות ציוד - סה"כ, לפי סטטוס, לפי סוג, אחריות שפגה',
    parameters: { type: 'OBJECT', properties: {} },
  },
  // ============ STAGE 6.3: USERS (ADMIN ONLY) ============
  {
    name: 'getUsers',
    description: 'רשימת משתמשי מערכת (למנהלים בלבד). זמין רק עבור תפקיד ADMIN.',
    parameters: {
      type: 'OBJECT',
      properties: {
        role: { type: 'STRING', description: 'סינון לפי תפקיד: ADMIN, MANAGER, USER' },
      },
    },
  },
  {
    name: 'getUserById',
    description: 'פרטי משתמש ספציפי (למנהלים בלבד)',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING', description: 'מזהה המשתמש' },
      },
      required: ['id'],
    },
  },
  {
    name: 'countUsers',
    description: 'ספירת משתמשים במערכת (למנהלים בלבד)',
    parameters: {
      type: 'OBJECT',
      properties: {
        role: { type: 'STRING', description: 'סינון לפי תפקיד' },
      },
    },
  },
  // ============ STAGE 6.3 R4: ACTIVITY LOG ============
  {
    name: 'getActivityLogs',
    description: 'שליפת יומן פעילויות. זמין למנהלים (ADMIN, MANAGER). לשאלות כמו "מה קרה?", "מי עשה?", "מתי שונה?"',
    parameters: {
      type: 'OBJECT',
      properties: {
        userEmail: { type: 'STRING', description: 'סינון לפי משתמש' },
        action: { type: 'STRING', description: 'סוג פעולה: CREATE, READ, UPDATE, DELETE, LOGIN_SUCCESS, LOGOUT' },
        category: { type: 'STRING', description: 'קטגוריה: auth, data, navigation, agent, system' },
        module: { type: 'STRING', description: 'מודול: hr, projects, contacts, vehicles, equipment' },
        targetType: { type: 'STRING', description: 'סוג יעד' },
        targetId: { type: 'STRING', description: 'מזהה יעד' },
        startDate: { type: 'STRING', description: 'תאריך התחלה (ISO format)' },
        endDate: { type: 'STRING', description: 'תאריך סיום (ISO format)' },
        limit: { type: 'NUMBER', description: 'מספר רשומות מקסימלי' },
      },
    },
  },
  {
    name: 'getActivityStats',
    description: 'סטטיסטיקות פעילות במערכת - לפי קטגוריה, מודול, משתמש',
    parameters: {
      type: 'OBJECT',
      properties: {
        startDate: { type: 'STRING', description: 'תאריך התחלה' },
        endDate: { type: 'STRING', description: 'תאריך סיום' },
      },
    },
  },
  {
    name: 'getEntityHistory',
    description: 'היסטוריית שינויים של ישות ספציפית. לשאלות כמו "מה השתנה באיש קשר X?" או "מי עדכן את הפרויקט?"',
    parameters: {
      type: 'OBJECT',
      properties: {
        targetType: { type: 'STRING', description: 'סוג הישות: Contact, Project, Employee, Vehicle' },
        targetId: { type: 'STRING', description: 'מזהה הישות' },
        limit: { type: 'NUMBER', description: 'מספר רשומות' },
      },
      required: ['targetType', 'targetId'],
    },
  },
  {
    name: 'getUserActivity',
    description: 'סיכום פעילות של משתמש ספציפי',
    parameters: {
      type: 'OBJECT',
      properties: {
        userEmail: { type: 'STRING', description: 'כתובת אימייל המשתמש' },
        startDate: { type: 'STRING', description: 'תאריך התחלה' },
        endDate: { type: 'STRING', description: 'תאריך סיום' },
      },
      required: ['userEmail'],
    },
  },
  {
    name: 'getSecurityAudit',
    description: 'אירועי אבטחה במערכת - ניסיונות מניפולציה, דחיות הרשאה. למנהלים בלבד.',
    parameters: {
      type: 'OBJECT',
      properties: {
        startDate: { type: 'STRING', description: 'תאריך התחלה' },
        endDate: { type: 'STRING', description: 'תאריך סיום' },
        limit: { type: 'NUMBER', description: 'מספר רשומות' },
      },
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

## Stage 6.3: מסגרת תגובות מחייבת (Maybach Grade)

### R5: מצבי תגובה מותרים בלבד
כל תשובה חייבת להיות באחד מהמצבים הבאים:
1. **ANSWER_WITH_DATA** - נתונים נמצאו ואומתו
2. **ANSWER_WITH_ESTIMATION** - הערכה/ניתוח (חובה לסמן!)
3. **REFUSE_NO_PERMISSION** - אין לך הרשאה
4. **REFUSE_NO_DATA** - השאילתה הצליחה אך לא נמצאו תוצאות
5. **REFUSE_UNCERTAIN** - לא ניתן לקבוע בוודאות
6. **REFUSE_QUERY_FAILED** - שגיאה טכנית

### R2: הערכות וניתוחים - חובה לסמן!
אם אתה מספק הערכה, ניתוח, או מסקנה שאינה נתון גולמי:
- הוסף את הקידומת: "⚠️ הערכה: "
- ציין את בסיס ההערכה
- לעולם אל תציג הערכה כעובדה מוחלטת

### R1: הבחנה בין אין הרשאה לאין נתונים
- אם הפונקציה מחזירה error=PERMISSION_DENIED: אמור "אין לך הרשאה לצפות ב..."
- אם הפונקציה מחזירה state=REFUSE_NO_DATA: אמור "לא נמצאו תוצאות עבור..."
- לעולם אל תערבב בין השניים!

## כלל עליון - חובה!
**לעולם אל תמציא מידע!**
- תמיד קרא לפונקציה המתאימה לפני שאתה עונה על שאלה
- אם הפונקציה מחזירה null או רשימה ריקה - אמור "לא נמצא במערכת" ואל תנחש
- אם יש _meta.state בתוצאה - פעל בהתאם למצב
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
- **getEmployeesWithEducation** - לשאלות על מהנדסים, הנדסאים, תארים, הכשרות

### פרויקטים:
- getProjects, getProjectById, countProjects, getProjectsStats
- getProjectEvents, getProjectContacts, getProjectLeads

### אירועים:
- searchEvents, getRecentEvents, searchFileContents, getFileSummary

### אנשי קשר:
- getContacts, getContactById, getContactsByDiscipline, countContacts
- getOrganizations, getOrganizationById

### דירוגי ספקים:
- getVendorRatings, getTopRatedVendors, getVendorRatingStats

### רכבים - בסיסי:
- getVehicles, getVehicleById, getVehicleByDriver
- getVehicleFuelLogs, getVehicleServices
- getVehicleAccidents, getVehicleTickets
- countVehicles, getVehiclesStats, getVehiclesNeedingService

### רכבים - מורחב:
- **getVehicleDocuments** - מסמכי רכב (רישיון, ביטוח, בדיקת חורף) - סטטוס ותוקף בלבד
- **getVehiclesWithExpiringDocuments** - רכבים עם מסמכים שפגו/עומדים לפוג
- **getVehicleTollRoads** - נסיעות כביש אגרה
- **getTollRoadStats** - סטטיסטיקות כביש אגרה
- **getVehicleParkings** - חניות
- **getParkingStats** - סטטיסטיקות חניה
- **getVehicleAssignments** - היסטוריית שיוכי רכב

### מילון נתונים (Data Dictionary):
- **getSchemaCatalog** - מבנה הסכמה (לשאלות "מה יש במערכת?")
- **getFieldInfo** - מידע על שדה (לשאלות "מה זה status?")
- **findFieldBySynonym** - חיפוש שדה לפי מילה נרדפת

### ציוד (Stage 6.3):
- getEquipment, getEquipmentById, countEquipment, getEquipmentStats

### משתמשים (ADMIN בלבד):
- getUsers, getUserById, countUsers

### יומן פעילות (ADMIN/MANAGER):
- getActivityLogs - שליפת יומן
- getActivityStats - סטטיסטיקות פעילות
- getEntityHistory - היסטוריית שינויים של ישות
- getUserActivity - פעילות משתמש
- getSecurityAudit - אירועי אבטחה

### כללי:
- searchAll

## כללים:
- לשאלות על תוקף ביטוח/רישיון - השתמש ב-getVehicleDocuments או getVehiclesWithExpiringDocuments
- לשאלות על הוצאות כביש 6 - השתמש ב-getVehicleTollRoads או getTollRoadStats
- לשאלות על הוצאות חניה - השתמש ב-getVehicleParkings או getParkingStats
- לשאלות על שדות/סכמה - השתמש ב-getSchemaCatalog, getFieldInfo, findFieldBySynonym
- אל תמציא מידע שלא קיבלת מהפונקציות!

## קבצים ותמונות - חשוב!
**האייג'נט אינו משמש לצפייה בקבצים או תמונות.**
אם המשתמש מבקש לראות קובץ, תמונה, מסמך או URL:
- ענה: "צפייה בקבצים ותמונות מתבצעת דרך המודול הייעודי במערכת."
- לא מחזירים URLs לקבצים
- לא מציגים תמונות
- החריג: חילוץ תוכן טקסטואלי מאירועי פרויקט (searchFileContents)

## שדות רגישים - לעולם לא להציג:
- idNumber (תעודת זהות)
- grossSalary (שכר)
- URLs למסמכים אישיים (חוזים, רישיונות, תעודות זהות)
`,
  });
}

export { genAI };
