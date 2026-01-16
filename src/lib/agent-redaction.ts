// ================================================
// WDI ERP - Agent Redaction Layer
// Version: 20260116-151500
// Purpose: Central security layer - removes sensitive fields from all Agent responses
// ================================================

/**
 * רשימת שדות רגישים שלעולם לא יוחזרו דרך ה-Agent
 * מחולק לפי קטגוריות
 */

// שדות PII (Personally Identifiable Information)
const PII_FIELDS = [
  'idNumber',
  'spouseIdNumber',
] as const;

// שדות פיננסיים
const FINANCIAL_FIELDS = [
  'grossSalary',
  'salary',
  'netSalary',
  'bankAccount',
  'bankBranch',
] as const;

// שדות קבצים רגישים
const SENSITIVE_FILE_FIELDS = [
  'idCardFileUrl',
  'idCardSpouseFileUrl',
  'driversLicenseFileUrl',
  'contractFileUrl',
  'passportFileUrl',
] as const;

// כל השדות הרגישים
export const SENSITIVE_FIELDS = [
  ...PII_FIELDS,
  ...FINANCIAL_FIELDS,
  ...SENSITIVE_FILE_FIELDS,
] as const;

export type SensitiveField = typeof SENSITIVE_FIELDS[number];

/**
 * מסיר שדות רגישים מאובייקט
 * @param obj - האובייקט לניקוי
 * @returns אובייקט ללא שדות רגישים
 */
export function redactSensitiveFields<T extends Record<string, any>>(obj: T): Omit<T, SensitiveField> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  for (const field of SENSITIVE_FIELDS) {
    if (field in result) {
      delete (result as any)[field];
    }
  }
  
  return result as Omit<T, SensitiveField>;
}

/**
 * מסיר שדות רגישים ממערך של אובייקטים
 * @param arr - המערך לניקוי
 * @returns מערך עם אובייקטים ללא שדות רגישים
 */
export function redactSensitiveFieldsArray<T extends Record<string, any>>(arr: T[]): Omit<T, SensitiveField>[] {
  if (!Array.isArray(arr)) return arr;
  return arr.map(obj => redactSensitiveFields(obj));
}

/**
 * מסיר שדות רגישים מאובייקט עובד
 * כולל טיפול בשדות מקוננים (spouse, children)
 */
export function redactEmployeeData<T extends Record<string, any>>(employee: T): any {
  if (!employee) return employee;
  
  const result: any = redactSensitiveFields(employee);
  
  // טיפול ב-spouse מקונן
  if (result.spouse && typeof result.spouse === 'object') {
    result.spouse = redactSensitiveFields(result.spouse);
  }
  
  // טיפול ב-children מקונן
  if (Array.isArray(result.children)) {
    result.children = result.children.map((child: any) => {
      if (typeof child === 'object') {
        // הסרת ת.ז. של ילדים
        const { idNumber, ...rest } = child;
        return rest;
      }
      return child;
    });
  }
  
  return result;
}

/**
 * מסיר שדות רגישים ממערך עובדים
 */
export function redactEmployeesData<T extends Record<string, any>>(employees: T[]): any[] {
  if (!Array.isArray(employees)) return employees;
  return employees.map(emp => redactEmployeeData(emp));
}

/**
 * בדיקה האם שדה הוא רגיש
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELDS.includes(fieldName as SensitiveField);
}

/**
 * יוצר select object ל-Prisma שלא כולל שדות רגישים
 * @param fields - רשימת השדות הרצויים
 * @returns select object מסונן
 */
export function createSafeSelect(fields: string[]): Record<string, boolean> {
  const select: Record<string, boolean> = {};
  
  for (const field of fields) {
    if (!isSensitiveField(field)) {
      select[field] = true;
    }
  }
  
  return select;
}

/**
 * רשימת שדות בטוחים להחזרה עבור Employee
 */
export const SAFE_EMPLOYEE_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'role',
  'department',
  'status',
  'phone',
  'email',
  'personalEmail',
  'address',
  'employmentType',
  'employmentPercent',
  'employeeCategory',
  'startDate',
  'endDate',
  'birthDate',
  'linkedinUrl',
  'photoUrl',
  'securityClearance',
  'spouseFirstName',
  'spouseLastName',
  'spouseBirthDate',
  'spousePhone',
  'spouseEmail',
  'marriageDate',
  'children',
  'education',
  'certifications',
] as const;

/**
 * יוצר select object בטוח עבור Employee
 */
export function getSafeEmployeeSelect(): Record<string, boolean> {
  const select: Record<string, boolean> = {};
  for (const field of SAFE_EMPLOYEE_FIELDS) {
    select[field] = true;
  }
  return select;
}

// ============ EXPORTS ============

export default {
  SENSITIVE_FIELDS,
  redactSensitiveFields,
  redactSensitiveFieldsArray,
  redactEmployeeData,
  redactEmployeesData,
  isSensitiveField,
  createSafeSelect,
  getSafeEmployeeSelect,
  SAFE_EMPLOYEE_FIELDS,
};
