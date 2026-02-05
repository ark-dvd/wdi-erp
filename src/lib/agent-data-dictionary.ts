// ================================================
// WDI ERP - Agent Data Dictionary
// Version: 20260116-130000
// Purpose: Provide schema metadata for Agent queries
// Auto-generated from Prisma schema + manual additions
// ================================================

/**
 * Data Dictionary Entry
 */
interface FieldInfo {
  name: string;
  type: string;
  description: string;
  enumValues?: string[];
  sensitive?: boolean;
  synonyms?: string[];
  hebrewName?: string;
}

interface EntityInfo {
  name: string;
  hebrewName: string;
  description: string;
  fields: Record<string, FieldInfo>;
}

// ============ SCHEMA CATALOG ============

export const schemaCatalog: Record<string, EntityInfo> = {
  // ============ EMPLOYEE ============
  Employee: {
    name: 'Employee',
    hebrewName: 'עובד',
    description: 'מידע על עובדי החברה',
    fields: {
      id: { name: 'id', type: 'String', description: 'מזהה ייחודי', hebrewName: 'מזהה' },
      firstName: { name: 'firstName', type: 'String', description: 'שם פרטי', hebrewName: 'שם פרטי', synonyms: ['שם', 'first name'] },
      lastName: { name: 'lastName', type: 'String', description: 'שם משפחה', hebrewName: 'שם משפחה', synonyms: ['משפחה', 'last name'] },
      idNumber: { name: 'idNumber', type: 'String', description: 'תעודת זהות', hebrewName: 'ת.ז.', sensitive: true, synonyms: ['תז', 'ת.ז', 'תעודת זהות', 'מספר זהות'] },
      birthDate: { name: 'birthDate', type: 'DateTime', description: 'תאריך לידה', hebrewName: 'תאריך לידה', synonyms: ['יום הולדת'] },
      phone: { name: 'phone', type: 'String', description: 'טלפון', hebrewName: 'טלפון', synonyms: ['נייד', 'פלאפון', 'מספר טלפון'] },
      email: { name: 'email', type: 'String', description: 'דוא"ל עבודה', hebrewName: 'אימייל', synonyms: ['מייל', 'דואר אלקטרוני'] },
      personalEmail: { name: 'personalEmail', type: 'String', description: 'דוא"ל אישי', hebrewName: 'אימייל אישי' },
      address: { name: 'address', type: 'String', description: 'כתובת מגורים', hebrewName: 'כתובת', synonyms: ['מקום מגורים', 'גר ב'] },
      role: { name: 'role', type: 'String', description: 'תפקיד', hebrewName: 'תפקיד', synonyms: ['תפקיד בחברה', 'position'] },
      department: { name: 'department', type: 'String', description: 'מחלקה', hebrewName: 'מחלקה', synonyms: ['יחידה', 'אגף'] },
      employmentType: { 
        name: 'employmentType', 
        type: 'String', 
        description: 'סוג העסקה', 
        hebrewName: 'סוג העסקה',
        enumValues: ['אורגני', 'קבלן', 'פרילנסר', 'יועץ'],
        synonyms: ['צורת העסקה']
      },
      employmentPercent: { name: 'employmentPercent', type: 'Float', description: 'אחוז משרה', hebrewName: 'אחוז משרה', synonyms: ['היקף משרה'] },
      status: {
        name: 'status',
        type: 'String',
        description: 'סטטוס עובד',
        hebrewName: 'סטטוס',
        enumValues: ['פעיל', 'לא פעיל'],
        synonyms: ['מצב', 'active', 'inactive']
      },
      startDate: { name: 'startDate', type: 'DateTime', description: 'תאריך תחילת עבודה', hebrewName: 'תאריך התחלה', synonyms: ['התחיל לעבוד', 'ותק'] },
      endDate: { name: 'endDate', type: 'DateTime', description: 'תאריך סיום עבודה', hebrewName: 'תאריך סיום', synonyms: ['עזב', 'סיים'] },
      grossSalary: { name: 'grossSalary', type: 'Float', description: 'שכר ברוטו', hebrewName: 'שכר', sensitive: true, synonyms: ['משכורת', 'שכר ברוטו'] },
      securityClearance: { 
        name: 'securityClearance', 
        type: 'Int', 
        description: 'רמת סיווג ביטחוני (1-5)', 
        hebrewName: 'סיווג ביטחוני',
        enumValues: ['1', '2', '3', '4', '5'],
        synonyms: ['סיווג', 'רמת אבטחה']
      },
      education: { name: 'education', type: 'JSON', description: 'השכלה', hebrewName: 'השכלה', synonyms: ['תואר', 'לימודים'] },
      certifications: { name: 'certifications', type: 'JSON', description: 'הכשרות ותעודות', hebrewName: 'הכשרות', synonyms: ['תעודות', 'הסמכות'] },
      children: { name: 'children', type: 'JSON', description: 'ילדים', hebrewName: 'ילדים', synonyms: ['ילד', 'בנים', 'בנות'] },
      photoUrl: { name: 'photoUrl', type: 'String', description: 'תמונת פרופיל', hebrewName: 'תמונה' },
      linkedinUrl: { name: 'linkedinUrl', type: 'String', description: 'קישור לינקדאין', hebrewName: 'לינקדאין' },
      idCardFileUrl: { name: 'idCardFileUrl', type: 'String', description: 'צילום ת.ז.', hebrewName: 'קובץ ת.ז.', sensitive: true },
      contractFileUrl: { name: 'contractFileUrl', type: 'String', description: 'חוזה העסקה', hebrewName: 'חוזה', sensitive: true },
      driversLicenseFileUrl: { name: 'driversLicenseFileUrl', type: 'String', description: 'רישיון נהיגה', hebrewName: 'רישיון נהיגה', sensitive: true },
    }
  },

  // ============ PROJECT ============
  Project: {
    name: 'Project',
    hebrewName: 'פרויקט',
    description: 'פרויקטי בנייה ותשתיות',
    fields: {
      id: { name: 'id', type: 'String', description: 'מזהה ייחודי', hebrewName: 'מזהה' },
      projectNumber: { name: 'projectNumber', type: 'String', description: 'מספר פרויקט', hebrewName: 'מספר פרויקט', synonyms: ['מספר', 'קוד'] },
      name: { name: 'name', type: 'String', description: 'שם הפרויקט', hebrewName: 'שם', synonyms: ['שם פרויקט'] },
      address: { name: 'address', type: 'String', description: 'כתובת הפרויקט', hebrewName: 'כתובת', synonyms: ['מיקום', 'איפה'] },
      category: { name: 'category', type: 'String', description: 'קטגוריה', hebrewName: 'קטגוריה', synonyms: ['סוג', 'תחום'] },
      client: { name: 'client', type: 'String', description: 'לקוח', hebrewName: 'לקוח', synonyms: ['יזם', 'מזמין'] },
      phase: { name: 'phase', type: 'String', description: 'שלב', hebrewName: 'שלב', synonyms: ['סטייג', 'stage'] },
      state: {
        name: 'state',
        type: 'String',
        description: 'מצב הפרויקט',
        hebrewName: 'מצב',
        enumValues: ['פעיל', 'הושלם', 'מושהה', 'בוטל'],
        synonyms: ['סטטוס', 'active', 'completed', 'suspended', 'cancelled']
      },
      area: { name: 'area', type: 'Float', description: 'שטח במ"ר', hebrewName: 'שטח', synonyms: ['גודל', 'מטרים'] },
      estimatedCost: { name: 'estimatedCost', type: 'Float', description: 'עלות משוערת', hebrewName: 'עלות', synonyms: ['תקציב', 'מחיר'] },
      startDate: { name: 'startDate', type: 'DateTime', description: 'תאריך התחלה', hebrewName: 'תאריך התחלה' },
      endDate: { name: 'endDate', type: 'DateTime', description: 'תאריך סיום', hebrewName: 'תאריך סיום' },
      description: { name: 'description', type: 'String', description: 'תיאור', hebrewName: 'תיאור' },
      projectType: {
        name: 'projectType',
        type: 'String',
        description: 'סוג פרויקט',
        hebrewName: 'סוג פרויקט',
        enumValues: ['single', 'multi', 'mega'],
        synonyms: ['רמה']
      },
      level: {
        name: 'level',
        type: 'String',
        description: 'רמה בהיררכיה',
        hebrewName: 'רמה',
        enumValues: ['project', 'quarter', 'building'],
      },
    }
  },

  // ============ VEHICLE ============
  Vehicle: {
    name: 'Vehicle',
    hebrewName: 'רכב',
    description: 'צי רכבים של החברה',
    fields: {
      id: { name: 'id', type: 'String', description: 'מזהה ייחודי', hebrewName: 'מזהה' },
      licensePlate: { name: 'licensePlate', type: 'String', description: 'מספר רישוי', hebrewName: 'מספר רישוי', synonyms: ['לוחית', 'מספר רכב'] },
      manufacturer: { name: 'manufacturer', type: 'String', description: 'יצרן', hebrewName: 'יצרן', synonyms: ['מותג', 'חברה'] },
      model: { name: 'model', type: 'String', description: 'דגם', hebrewName: 'דגם' },
      year: { name: 'year', type: 'Int', description: 'שנת ייצור', hebrewName: 'שנה' },
      color: { name: 'color', type: 'String', description: 'צבע', hebrewName: 'צבע' },
      status: {
        name: 'status',
        type: 'Enum',
        description: 'סטטוס רכב',
        hebrewName: 'סטטוס',
        enumValues: ['ACTIVE', 'IN_SERVICE', 'RETURNED', 'SOLD'],
        synonyms: ['פעיל', 'בטיפול', 'הוחזר', 'נמכר']
      },
      contractType: {
        name: 'contractType',
        type: 'String',
        description: 'סוג חוזה',
        hebrewName: 'סוג חוזה',
        enumValues: ['RENTAL', 'LEASING'],
        synonyms: ['השכרה', 'ליסינג', 'rental', 'leasing']
      },
      currentKm: { name: 'currentKm', type: 'Int', description: 'קילומטראז נוכחי', hebrewName: 'קילומטראז', synonyms: ['ק"מ', 'מרחק'] },
      nextServiceDate: { name: 'nextServiceDate', type: 'DateTime', description: 'תאריך טיפול הבא', hebrewName: 'טיפול הבא' },
      nextServiceKm: { name: 'nextServiceKm', type: 'Int', description: 'ק"מ לטיפול הבא', hebrewName: 'ק"מ לטיפול' },
    }
  },

  // ============ VEHICLE DOCUMENT ============
  VehicleDocument: {
    name: 'VehicleDocument',
    hebrewName: 'מסמך רכב',
    description: 'מסמכי רכב (רישיון, ביטוח, בדיקות)',
    fields: {
      type: {
        name: 'type',
        type: 'Enum',
        description: 'סוג מסמך',
        hebrewName: 'סוג',
        enumValues: ['LICENSE', 'INSURANCE', 'WINTER_CHECK'],
        synonyms: ['רישיון', 'ביטוח', 'בדיקת חורף', 'טסט']
      },
      expiryDate: { name: 'expiryDate', type: 'DateTime', description: 'תאריך תפוגה', hebrewName: 'תוקף', synonyms: ['פג תוקף', 'עד מתי'] },
    }
  },

  // ============ EQUIPMENT ============
  Equipment: {
    name: 'Equipment',
    hebrewName: 'ציוד',
    description: 'ציוד משרדי וטכנולוגי',
    fields: {
      id: { name: 'id', type: 'String', description: 'מזהה ייחודי', hebrewName: 'מזהה' },
      type: {
        name: 'type',
        type: 'String',
        description: 'סוג ציוד',
        hebrewName: 'סוג',
        enumValues: ['LAPTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET', 'CHARGER', 'DOCKING_STATION', 'OTHER'],
        synonyms: ['מחשב נייד', 'מסך', 'מקלדת', 'עכבר', 'אוזניות', 'מטען', 'תחנת עגינה']
      },
      status: {
        name: 'status',
        type: 'String',
        description: 'סטטוס',
        hebrewName: 'סטטוס',
        enumValues: ['ACTIVE', 'INACTIVE', 'IN_REPAIR', 'SOLD', 'LOST'],
        synonyms: ['פעיל', 'לא פעיל', 'בתיקון', 'נמכר', 'אבד']
      },
      serialNumber: { name: 'serialNumber', type: 'String', description: 'מספר סריאלי', hebrewName: 'מספר סריאלי', synonyms: ['סריאל', 'S/N'] },
      manufacturer: { name: 'manufacturer', type: 'String', description: 'יצרן', hebrewName: 'יצרן' },
      model: { name: 'model', type: 'String', description: 'דגם', hebrewName: 'דגם' },
      warrantyEnd: { name: 'warrantyEnd', type: 'DateTime', description: 'סיום אחריות', hebrewName: 'אחריות', synonyms: ['תום אחריות'] },
    }
  },

  // ============ CONTACT ============
  Contact: {
    name: 'Contact',
    hebrewName: 'איש קשר',
    description: 'אנשי קשר חיצוניים',
    fields: {
      id: { name: 'id', type: 'String', description: 'מזהה ייחודי', hebrewName: 'מזהה' },
      firstName: { name: 'firstName', type: 'String', description: 'שם פרטי', hebrewName: 'שם פרטי' },
      lastName: { name: 'lastName', type: 'String', description: 'שם משפחה', hebrewName: 'שם משפחה' },
      phone: { name: 'phone', type: 'String', description: 'טלפון', hebrewName: 'טלפון' },
      email: { name: 'email', type: 'String', description: 'דוא"ל', hebrewName: 'אימייל' },
      role: { name: 'role', type: 'String', description: 'תפקיד', hebrewName: 'תפקיד' },
      status: {
        name: 'status',
        type: 'String',
        description: 'סטטוס',
        hebrewName: 'סטטוס',
        enumValues: ['פעיל', 'לא פעיל'],
      },
      contactTypes: {
        name: 'contactTypes',
        type: 'String[]',
        description: 'סוגי איש קשר',
        hebrewName: 'סוג',
        enumValues: ['ספק', 'יועץ', 'קבלן', 'לקוח', 'רשות'],
        synonyms: ['vendor', 'consultant', 'contractor', 'client', 'authority']
      },
      disciplines: {
        name: 'disciplines',
        type: 'String[]',
        description: 'דיסציפלינות',
        hebrewName: 'תחום',
        enumValues: ['אדריכלות', 'הנדסת מבנים', 'חשמל', 'אינסטלציה', 'מיזוג אוויר', 'בטיחות', 'נגישות'],
      },
    }
  },

  // ============ ORGANIZATION ============
  Organization: {
    name: 'Organization',
    hebrewName: 'ארגון',
    description: 'חברות וארגונים',
    fields: {
      id: { name: 'id', type: 'String', description: 'מזהה ייחודי', hebrewName: 'מזהה' },
      name: { name: 'name', type: 'String', description: 'שם הארגון', hebrewName: 'שם' },
      type: { name: 'type', type: 'String', description: 'סוג ארגון', hebrewName: 'סוג' },
      phone: { name: 'phone', type: 'String', description: 'טלפון', hebrewName: 'טלפון' },
      email: { name: 'email', type: 'String', description: 'דוא"ל', hebrewName: 'אימייל' },
      website: { name: 'website', type: 'String', description: 'אתר', hebrewName: 'אתר' },
      address: { name: 'address', type: 'String', description: 'כתובת', hebrewName: 'כתובת' },
      isVendor: { name: 'isVendor', type: 'Boolean', description: 'האם ספק', hebrewName: 'ספק' },
    }
  },

  // ============ PROJECT EVENT ============
  ProjectEvent: {
    name: 'ProjectEvent',
    hebrewName: 'אירוע פרויקט',
    description: 'אירועים ותיעוד בפרויקטים',
    fields: {
      id: { name: 'id', type: 'String', description: 'מזהה ייחודי', hebrewName: 'מזהה' },
      eventType: {
        name: 'eventType',
        type: 'String',
        description: 'סוג אירוע',
        hebrewName: 'סוג',
        enumValues: ['אדמיניסטרציה', 'אתגר', 'בטיחות', 'גבייה', 'החלטה', 'לקוח', 'לקחים', 'סיכום פגישה', 'תיעוד', 'אחר'],
      },
      eventDate: { name: 'eventDate', type: 'DateTime', description: 'תאריך האירוע', hebrewName: 'תאריך' },
      description: { name: 'description', type: 'String', description: 'תיאור', hebrewName: 'תיאור' },
    }
  },

  // ============ INDIVIDUAL REVIEW ============
  IndividualReview: {
    name: 'IndividualReview',
    hebrewName: 'דירוג אינדיבידואלי',
    description: 'דירוג יועצים וספקים',
    fields: {
      id: { name: 'id', type: 'String', description: 'מזהה ייחודי', hebrewName: 'מזהה' },
      avgRating: { name: 'avgRating', type: 'Float', description: 'ציון ממוצע', hebrewName: 'ממוצע', synonyms: ['דירוג', 'ציון'] },
      // 12 קריטריונים
      accountability: { name: 'accountability', type: 'Int', description: 'אחריות ומחויבות', hebrewName: 'אחריות', synonyms: ['מחויבות'] },
      boqQuality: { name: 'boqQuality', type: 'Int', description: 'איכות כתב כמויות', hebrewName: 'כתב כמויות', synonyms: ['BOQ'] },
      specQuality: { name: 'specQuality', type: 'Int', description: 'איכות מפרטים', hebrewName: 'מפרטים', synonyms: ['specs'] },
      planQuality: { name: 'planQuality', type: 'Int', description: 'איכות תכניות', hebrewName: 'תכניות', synonyms: ['plans'] },
      valueEngineering: { name: 'valueEngineering', type: 'Int', description: 'הנדסת ערך', hebrewName: 'הנדסת ערך', synonyms: ['VE'] },
      availability: { name: 'availability', type: 'Int', description: 'זמינות', hebrewName: 'זמינות' },
      interpersonal: { name: 'interpersonal', type: 'Int', description: 'יחסים בינאישיים', hebrewName: 'יחסים בינאישיים' },
      creativity: { name: 'creativity', type: 'Int', description: 'יצירתיות', hebrewName: 'יצירתיות' },
      expertise: { name: 'expertise', type: 'Int', description: 'מומחיות מקצועית', hebrewName: 'מומחיות' },
      timelinessAdherence: { name: 'timelinessAdherence', type: 'Int', description: 'עמידה בלוחות זמנים', hebrewName: 'עמידה בזמנים' },
      proactivity: { name: 'proactivity', type: 'Int', description: 'יוזמה ופרואקטיביות', hebrewName: 'יוזמה' },
      communication: { name: 'communication', type: 'Int', description: 'תקשורת', hebrewName: 'תקשורת' },
    }
  },
};

// ============ API FUNCTIONS ============

/**
 * מחזיר את כל הסכמה
 */
export function getSchemaCatalog(): typeof schemaCatalog {
  return schemaCatalog;
}

/**
 * מחזיר רשימת כל הישויות
 */
export function getEntities(): string[] {
  return Object.keys(schemaCatalog);
}

/**
 * מחזיר מידע על ישות
 */
export function getEntityInfo(entityName: string): EntityInfo | null {
  const key = Object.keys(schemaCatalog).find(
    k => k.toLowerCase() === entityName.toLowerCase() ||
         schemaCatalog[k].hebrewName === entityName
  );
  return key ? schemaCatalog[key] : null;
}

/**
 * מחזיר מידע על שדה
 */
export function getFieldInfo(entityName: string, fieldName: string): FieldInfo | null {
  const entity = getEntityInfo(entityName);
  if (!entity) return null;
  
  // חיפוש לפי שם שדה או synonym
  for (const [key, field] of Object.entries(entity.fields)) {
    if (key.toLowerCase() === fieldName.toLowerCase() ||
        field.hebrewName === fieldName ||
        field.synonyms?.some(s => s.toLowerCase() === fieldName.toLowerCase())) {
      return field;
    }
  }
  
  return null;
}

/**
 * בודק אם שדה רגיש
 */
export function isFieldSensitive(entityName: string, fieldName: string): boolean {
  const field = getFieldInfo(entityName, fieldName);
  return field?.sensitive === true;
}

/**
 * מחזיר את כל השדות הרגישים של ישות
 */
export function getSensitiveFields(entityName: string): string[] {
  const entity = getEntityInfo(entityName);
  if (!entity) return [];
  
  return Object.entries(entity.fields)
    .filter(([_, field]) => field.sensitive)
    .map(([key, _]) => key);
}

/**
 * מחזיר ערכי enum של שדה
 */
export function getEnumValues(entityName: string, fieldName: string): string[] | null {
  const field = getFieldInfo(entityName, fieldName);
  return field?.enumValues || null;
}

/**
 * חיפוש שדה לפי synonym בכל הישויות
 */
export function findFieldBySynonym(synonym: string): { entity: string; field: FieldInfo } | null {
  for (const [entityName, entity] of Object.entries(schemaCatalog)) {
    for (const [_, field] of Object.entries(entity.fields)) {
      if (field.synonyms?.some(s => s.toLowerCase() === synonym.toLowerCase())) {
        return { entity: entityName, field };
      }
    }
  }
  return null;
}

// ============ EXPORTS ============

export default {
  schemaCatalog,
  getSchemaCatalog,
  getEntities,
  getEntityInfo,
  getFieldInfo,
  isFieldSensitive,
  getSensitiveFields,
  getEnumValues,
  findFieldBySynonym,
};
