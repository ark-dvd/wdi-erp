// ================================================
// WDI ERP - Agent Normalization Layer
// Version: 20260116-094000
// Purpose: Translate Hebrew ↔ English values for status/type fields
// ================================================

/**
 * Normalizer לשדות סטטוס וסוג
 * ממיר קלט משתמש (עברית/אנגלית/יחיד/רבים) לערך התקני בסכמה
 */

// ============ STATUS NORMALIZATIONS ============

/**
 * Employee status: עברית בסכמה
 * ערכים אפשריים: "פעיל", "לא פעיל"
 */
export function normalizeEmployeeStatus(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  const normalized = lower
    .replace(/ים$/, '') // הסרת סיומת רבים
    .replace(/ות$/, ''); // הסרת סיומת רבים נקבה
  
  const map: Record<string, string> = {
    // עברית
    'פעיל': 'פעיל',
    'פעילים': 'פעיל',
    'פעילות': 'פעיל',
    'אקטיבי': 'פעיל',
    'אקטיביים': 'פעיל',
    'לא פעיל': 'לא פעיל',
    'לא פעילים': 'לא פעיל',
    'לא פעילות': 'לא פעיל',
    'מושבת': 'לא פעיל',
    'מושבתים': 'לא פעיל',
    // אנגלית
    'active': 'פעיל',
    'inactive': 'לא פעיל',
    'disabled': 'לא פעיל',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || map[normalized] || undefined;
}

/**
 * Vehicle status: אנגלית enum בסכמה
 * ערכים: ACTIVE, IN_SERVICE, RETURNED, SOLD
 */
export function normalizeVehicleStatus(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'פעיל': 'ACTIVE',
    'פעילים': 'ACTIVE',
    'פעילות': 'ACTIVE',
    'אקטיבי': 'ACTIVE',
    'אקטיביים': 'ACTIVE',
    'בטיפול': 'IN_SERVICE',
    'בשירות': 'IN_SERVICE',
    'במוסך': 'IN_SERVICE',
    'הוחזר': 'RETURNED',
    'מוחזר': 'RETURNED',
    'הוחזרו': 'RETURNED',
    'נמכר': 'SOLD',
    'נמכרו': 'SOLD',
    // אנגלית
    'active': 'ACTIVE',
    'in_service': 'IN_SERVICE',
    'in service': 'IN_SERVICE',
    'inservice': 'IN_SERVICE',
    'returned': 'RETURNED',
    'sold': 'SOLD',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Equipment status: אנגלית enum בסכמה
 * ערכים: ACTIVE, INACTIVE, IN_REPAIR, SOLD, LOST
 */
export function normalizeEquipmentStatus(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'פעיל': 'ACTIVE',
    'פעילים': 'ACTIVE',
    'אקטיבי': 'ACTIVE',
    'לא פעיל': 'INACTIVE',
    'לא פעילים': 'INACTIVE',
    'מושבת': 'INACTIVE',
    'מושבתים': 'INACTIVE',
    'בתיקון': 'IN_REPAIR',
    'בטיפול': 'IN_REPAIR',
    'בשירות': 'IN_REPAIR',
    'נמכר': 'SOLD',
    'נמכרו': 'SOLD',
    'אבד': 'LOST',
    'אבודים': 'LOST',
    'חסר': 'LOST',
    'חסרים': 'LOST',
    // אנגלית
    'active': 'ACTIVE',
    'inactive': 'INACTIVE',
    'in_repair': 'IN_REPAIR',
    'in repair': 'IN_REPAIR',
    'repair': 'IN_REPAIR',
    'sold': 'SOLD',
    'lost': 'LOST',
    'missing': 'LOST',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Contact/Project status: עברית בסכמה
 * ערכים: "פעיל"
 */
export function normalizeContactStatus(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'פעיל': 'פעיל',
    'פעילים': 'פעיל',
    'פעילות': 'פעיל',
    'אקטיבי': 'פעיל',
    'לא פעיל': 'לא פעיל',
    'לא פעילים': 'לא פעיל',
    // אנגלית
    'active': 'פעיל',
    'inactive': 'לא פעיל',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Project state: עברית בסכמה
 * ערכים: "פעיל", "הושלם", "מושהה", "בוטל"
 */
export function normalizeProjectState(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'פעיל': 'פעיל',
    'פעילים': 'פעיל',
    'פעילות': 'פעיל',
    'אקטיבי': 'פעיל',
    'הושלם': 'הושלם',
    'הושלמו': 'הושלם',
    'סיים': 'הושלם',
    'הסתיים': 'הושלם',
    'מושהה': 'מושהה',
    'מושהים': 'מושהה',
    'מוקפא': 'מושהה',
    'הוקפא': 'מושהה',
    'בוטל': 'בוטל',
    'בוטלו': 'בוטל',
    'מבוטל': 'בוטל',
    // אנגלית
    'active': 'פעיל',
    'completed': 'הושלם',
    'done': 'הושלם',
    'finished': 'הושלם',
    'suspended': 'מושהה',
    'paused': 'מושהה',
    'on hold': 'מושהה',
    'onhold': 'מושהה',
    'cancelled': 'בוטל',
    'canceled': 'בוטל',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Ticket status: אנגלית enum בסכמה
 * ערכים: PENDING, PAID, APPEALED, CANCELLED
 */
export function normalizeTicketStatus(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'ממתין': 'PENDING',
    'ממתינים': 'PENDING',
    'לא שולם': 'PENDING',
    'פתוח': 'PENDING',
    'פתוחים': 'PENDING',
    'שולם': 'PAID',
    'שולמו': 'PAID',
    'בערעור': 'APPEALED',
    'מערער': 'APPEALED',
    'בוטל': 'CANCELLED',
    'בוטלו': 'CANCELLED',
    'מבוטל': 'CANCELLED',
    // אנגלית
    'pending': 'PENDING',
    'unpaid': 'PENDING',
    'open': 'PENDING',
    'paid': 'PAID',
    'appealed': 'APPEALED',
    'appeal': 'APPEALED',
    'cancelled': 'CANCELLED',
    'canceled': 'CANCELLED',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Accident status: עברית בסכמה
 * ערכים: "פתוח", "בטיפול", "סגור"
 */
export function normalizeAccidentStatus(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'פתוח': 'פתוח',
    'פתוחים': 'פתוח',
    'פתוחות': 'פתוח',
    'בטיפול': 'בטיפול',
    'סגור': 'סגור',
    'סגורים': 'סגור',
    'סגורות': 'סגור',
    'נסגר': 'סגור',
    // אנגלית
    'open': 'פתוח',
    'in_progress': 'בטיפול',
    'in progress': 'בטיפול',
    'inprogress': 'בטיפול',
    'closed': 'סגור',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

// ============ TYPE NORMALIZATIONS ============

/**
 * Equipment type: אנגלית enum בסכמה
 */
export function normalizeEquipmentType(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'מחשב נייד': 'LAPTOP',
    'מחשבים ניידים': 'LAPTOP',
    'לפטופ': 'LAPTOP',
    'לפטופים': 'LAPTOP',
    'נייד': 'LAPTOP',
    'ניידים': 'LAPTOP',
    'מטען': 'CHARGER',
    'מטענים': 'CHARGER',
    'תחנת עגינה': 'DOCKING_STATION',
    'דוקינג': 'DOCKING_STATION',
    'עגינה': 'DOCKING_STATION',
    'מסך': 'MONITOR',
    'מסכים': 'MONITOR',
    'צג': 'MONITOR',
    'צגים': 'MONITOR',
    'עכבר': 'MOUSE',
    'עכברים': 'MOUSE',
    'מקלדת': 'KEYBOARD',
    'מקלדות': 'KEYBOARD',
    'זרוע': 'MONITOR_ARM',
    'זרוע למסך': 'MONITOR_ARM',
    'זרועות': 'MONITOR_ARM',
    'טלוויזיה': 'MEETING_ROOM_TV',
    'tv': 'MEETING_ROOM_TV',
    'מסך חדר ישיבות': 'MEETING_ROOM_TV',
    'מדפסת': 'PRINTER',
    'מדפסות': 'PRINTER',
    'סורק': 'SCANNER',
    'סורקים': 'SCANNER',
    'אחר': 'OTHER',
    // אנגלית
    'laptop': 'LAPTOP',
    'laptops': 'LAPTOP',
    'charger': 'CHARGER',
    'chargers': 'CHARGER',
    'docking': 'DOCKING_STATION',
    'docking_station': 'DOCKING_STATION',
    'docking station': 'DOCKING_STATION',
    'monitor': 'MONITOR',
    'monitors': 'MONITOR',
    'screen': 'MONITOR',
    'screens': 'MONITOR',
    'mouse': 'MOUSE',
    'mice': 'MOUSE',
    'keyboard': 'KEYBOARD',
    'keyboards': 'KEYBOARD',
    'monitor_arm': 'MONITOR_ARM',
    'monitor arm': 'MONITOR_ARM',
    'arm': 'MONITOR_ARM',
    'meeting_room_tv': 'MEETING_ROOM_TV',
    'meeting room tv': 'MEETING_ROOM_TV',
    'printer': 'PRINTER',
    'printers': 'PRINTER',
    'scanner': 'SCANNER',
    'scanners': 'SCANNER',
    'other': 'OTHER',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Vehicle document type: אנגלית enum בסכמה
 */
export function normalizeVehicleDocumentType(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'רישיון': 'LICENSE',
    'רישיון רכב': 'LICENSE',
    'רשיון': 'LICENSE',
    'ביטוח': 'INSURANCE',
    'תעודת ביטוח': 'INSURANCE',
    'פוליסה': 'INSURANCE',
    'בדיקת חורף': 'WINTER_CHECK',
    'בדיקה שנתית': 'WINTER_CHECK',
    'טסט': 'WINTER_CHECK',
    // אנגלית
    'license': 'LICENSE',
    'licence': 'LICENSE',
    'insurance': 'INSURANCE',
    'winter_check': 'WINTER_CHECK',
    'winter check': 'WINTER_CHECK',
    'wintercheck': 'WINTER_CHECK',
    'test': 'WINTER_CHECK',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Vehicle photo type: אנגלית enum בסכמה
 */
export function normalizeVehiclePhotoType(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'חזית': 'FRONT',
    'קדימה': 'FRONT',
    'מלפנים': 'FRONT',
    'אחור': 'REAR',
    'מאחור': 'REAR',
    'צד ימין': 'RIGHT_SIDE',
    'ימין': 'RIGHT_SIDE',
    'צד שמאל': 'LEFT_SIDE',
    'שמאל': 'LEFT_SIDE',
    'פנים': 'INTERIOR',
    'פנימי': 'INTERIOR',
    'אחר': 'OTHER',
    // אנגלית
    'front': 'FRONT',
    'rear': 'REAR',
    'back': 'REAR',
    'right': 'RIGHT_SIDE',
    'right_side': 'RIGHT_SIDE',
    'right side': 'RIGHT_SIDE',
    'left': 'LEFT_SIDE',
    'left_side': 'LEFT_SIDE',
    'left side': 'LEFT_SIDE',
    'interior': 'INTERIOR',
    'inside': 'INTERIOR',
    'other': 'OTHER',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Vehicle photo event type: אנגלית enum בסכמה
 */
export function normalizeVehiclePhotoEventType(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'קבלה': 'HANDOVER_IN',
    'מסירה': 'HANDOVER_OUT',
    'העברה': 'HANDOVER_OUT',
    'כללי': 'GENERAL',
    'רגיל': 'GENERAL',
    'תאונה': 'ACCIDENT',
    'נזק': 'ACCIDENT',
    'טיפול': 'SERVICE',
    'שירות': 'SERVICE',
    // אנגלית
    'handover_in': 'HANDOVER_IN',
    'handover in': 'HANDOVER_IN',
    'in': 'HANDOVER_IN',
    'receive': 'HANDOVER_IN',
    'handover_out': 'HANDOVER_OUT',
    'handover out': 'HANDOVER_OUT',
    'out': 'HANDOVER_OUT',
    'return': 'HANDOVER_OUT',
    'general': 'GENERAL',
    'accident': 'ACCIDENT',
    'damage': 'ACCIDENT',
    'service': 'SERVICE',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Vehicle contract type: אנגלית enum בסכמה
 */
export function normalizeVehicleContractType(input: string): string | undefined {
  if (!input) return undefined;
  
  const lower = input.toLowerCase().trim();
  
  const map: Record<string, string> = {
    // עברית
    'השכרה': 'RENTAL',
    'שכירות': 'RENTAL',
    'ליסינג': 'LEASING',
    'חכירה': 'LEASING',
    // אנגלית
    'rental': 'RENTAL',
    'rent': 'RENTAL',
    'leasing': 'LEASING',
    'lease': 'LEASING',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };
  
  return map[lower] || undefined;
}

/**
 * Project event type: עברית בסכמה
 * ערכים: אדמיניסטרציה, אתגר, בטיחות, גבייה, החלטה, לקוח, לקחים, סיכום פגישה, תיעוד, אחר
 */
export function normalizeProjectEventType(input: string): string | undefined {
  if (!input) return undefined;

  const lower = input.toLowerCase().trim();

  const map: Record<string, string> = {
    // עברית
    'אדמיניסטרציה': 'אדמיניסטרציה',
    'אדמין': 'אדמיניסטרציה',
    'מינהל': 'אדמיניסטרציה',
    'אתגר': 'אתגר',
    'אתגרים': 'אתגר',
    'בעיה': 'אתגר',
    'בעיות': 'אתגר',
    'בטיחות': 'בטיחות',
    'בטיחותי': 'בטיחות',
    'גבייה': 'גבייה',
    'גביה': 'גבייה',
    'תשלום': 'גבייה',
    'תשלומים': 'גבייה',
    'החלטה': 'החלטה',
    'החלטות': 'החלטה',
    'לקוח': 'לקוח',
    'לקוחות': 'לקוח',
    'לקחים': 'לקחים',
    'לקח': 'לקחים',
    'סיכום פגישה': 'סיכום פגישה',
    'פגישה': 'סיכום פגישה',
    'פגישות': 'סיכום פגישה',
    'תיעוד': 'תיעוד',
    'תיעודי': 'תיעוד',
    'דוקומנטציה': 'תיעוד',
    'מייל': 'מייל',
    'אימייל': 'מייל',
    'אחר': 'אחר',
    // אנגלית
    'administration': 'אדמיניסטרציה',
    'admin': 'אדמיניסטרציה',
    'challenge': 'אתגר',
    'challenges': 'אתגר',
    'issue': 'אתגר',
    'issues': 'אתגר',
    'safety': 'בטיחות',
    'collection': 'גבייה',
    'billing': 'גבייה',
    'payment': 'גבייה',
    'decision': 'החלטה',
    'decisions': 'החלטה',
    'client': 'לקוח',
    'customer': 'לקוח',
    'lessons': 'לקחים',
    'lessons_learned': 'לקחים',
    'lessons learned': 'לקחים',
    'meeting': 'סיכום פגישה',
    'meeting_summary': 'סיכום פגישה',
    'documentation': 'תיעוד',
    'doc': 'תיעוד',
    'email': 'מייל',
    'mail': 'מייל',
    'other': 'אחר',
    // כללי
    'all': 'all',
    'הכל': 'all',
    'כולם': 'all',
  };

  return map[lower] || undefined;
}

// ============ GENERIC NORMALIZER ============

/**
 * Normalizer גנרי שמזהה את סוג השדה ומפעיל את הנורמליזר המתאים
 */
export function normalize(field: string, value: string): string | undefined {
  if (!value) return undefined;
  
  const normalizers: Record<string, (input: string) => string | undefined> = {
    // Status fields
    'employee.status': normalizeEmployeeStatus,
    'vehicle.status': normalizeVehicleStatus,
    'equipment.status': normalizeEquipmentStatus,
    'contact.status': normalizeContactStatus,
    'project.state': normalizeProjectState,
    'ticket.status': normalizeTicketStatus,
    'accident.status': normalizeAccidentStatus,
    // Type fields
    'equipment.type': normalizeEquipmentType,
    'vehicleDocument.type': normalizeVehicleDocumentType,
    'vehiclePhoto.photoType': normalizeVehiclePhotoType,
    'vehiclePhoto.eventType': normalizeVehiclePhotoEventType,
    'vehicle.contractType': normalizeVehicleContractType,
    'projectEvent.eventType': normalizeProjectEventType,
  };
  
  const normalizer = normalizers[field];
  return normalizer ? normalizer(value) : value;
}

// ============ REVERSE TRANSLATIONS (DB → Hebrew display) ============

export const translations = {
  vehicleStatus: {
    'ACTIVE': 'פעיל',
    'IN_SERVICE': 'בטיפול',
    'RETURNED': 'הוחזר',
    'SOLD': 'נמכר',
  },
  equipmentStatus: {
    'ACTIVE': 'פעיל',
    'INACTIVE': 'לא פעיל',
    'IN_REPAIR': 'בתיקון',
    'SOLD': 'נמכר',
    'LOST': 'אבד',
  },
  equipmentType: {
    'LAPTOP': 'מחשב נייד',
    'CHARGER': 'מטען',
    'DOCKING_STATION': 'תחנת עגינה',
    'MONITOR': 'מסך',
    'MOUSE': 'עכבר',
    'KEYBOARD': 'מקלדת',
    'MONITOR_ARM': 'זרוע למסך',
    'MEETING_ROOM_TV': 'מסך חדר ישיבות',
    'PRINTER': 'מדפסת',
    'SCANNER': 'סורק',
    'OTHER': 'אחר',
  },
  vehicleDocumentType: {
    'LICENSE': 'רישיון רכב',
    'INSURANCE': 'ביטוח',
    'WINTER_CHECK': 'בדיקת חורף',
  },
  vehiclePhotoType: {
    'FRONT': 'חזית',
    'REAR': 'אחור',
    'RIGHT_SIDE': 'צד ימין',
    'LEFT_SIDE': 'צד שמאל',
    'INTERIOR': 'פנים',
    'OTHER': 'אחר',
  },
  vehiclePhotoEventType: {
    'HANDOVER_IN': 'קבלה',
    'HANDOVER_OUT': 'מסירה',
    'GENERAL': 'כללי',
    'ACCIDENT': 'תאונה',
    'SERVICE': 'טיפול',
  },
  ticketStatus: {
    'PENDING': 'ממתין לתשלום',
    'PAID': 'שולם',
    'APPEALED': 'בערעור',
    'CANCELLED': 'בוטל',
  },
  vehicleContractType: {
    'RENTAL': 'השכרה',
    'LEASING': 'ליסינג',
  },
};

/**
 * תרגום ערך מאנגלית לעברית
 */
export function translateToHebrew(category: keyof typeof translations, value: string): string {
  const categoryTranslations = translations[category] as Record<string, string>;
  return categoryTranslations[value] || value;
}
