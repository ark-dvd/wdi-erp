// ============================================
// WDI ERP - API Contract Utilities (Maybach Standard)
// Version: 20260124
// Implements: R1-R5 of Stage 5.3b requirements
// ============================================

import { NextResponse } from 'next/server'

// ============================================
// R1: PAGINATION
// ============================================

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationMeta
}

// Pagination defaults and limits
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const

/**
 * Parse pagination parameters from URL search params
 * Enforces defaults and max limits
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')

  let page = pageParam ? parseInt(pageParam, 10) : PAGINATION_DEFAULTS.page
  let limit = limitParam ? parseInt(limitParam, 10) : PAGINATION_DEFAULTS.limit

  // Validate and clamp values
  if (isNaN(page) || page < 1) page = PAGINATION_DEFAULTS.page
  if (isNaN(limit) || limit < 1) limit = PAGINATION_DEFAULTS.limit
  if (limit > PAGINATION_DEFAULTS.maxLimit) limit = PAGINATION_DEFAULTS.maxLimit

  return { page, limit }
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const pages = Math.ceil(total / limit)
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  }
}

/**
 * Create a paginated response envelope
 */
export function paginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    items,
    pagination: createPaginationMeta(page, limit, total),
  }
}

/**
 * Calculate skip value for Prisma queries
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit
}

// ============================================
// R2: FIELD-LEVEL VALIDATION ERRORS
// ============================================

export interface FieldError {
  field: string
  message: string
}

export interface ValidationErrorResponse {
  error: string
  fields: Record<string, string>
}

/**
 * Create a field-level validation error response
 */
export function validationError(
  errors: FieldError[] | Record<string, string>,
  generalMessage: string = 'שגיאת אימות נתונים'
): NextResponse<ValidationErrorResponse> {
  let fields: Record<string, string>

  if (Array.isArray(errors)) {
    fields = errors.reduce((acc, { field, message }) => {
      acc[field] = message
      return acc
    }, {} as Record<string, string>)
  } else {
    fields = errors
  }

  return NextResponse.json({ error: generalMessage, fields }, { status: 400 })
}

/**
 * Validate required fields and return field-level errors
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: { field: string; label: string }[]
): FieldError[] {
  const errors: FieldError[] = []

  for (const { field, label } of requiredFields) {
    const value = data[field]
    if (value === undefined || value === null || value === '') {
      errors.push({ field, message: `${label} הוא שדה חובה` })
    }
  }

  return errors
}

/**
 * Validate field format (email, phone, etc.)
 */
export function validateFormat(
  value: string | undefined | null,
  field: string,
  pattern: RegExp,
  message: string
): FieldError | null {
  if (!value) return null // Skip empty values (use validateRequired for that)
  if (!pattern.test(value)) {
    return { field, message }
  }
  return null
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[0-9\-+() ]{7,20}$/,
  israeliId: /^[0-9]{9}$/,
  licensePlate: /^[0-9]{2,3}-[0-9]{2,3}-[0-9]{2,3}$/,
} as const

// ============================================
// R3: FILTER VALIDATION (NO SILENT IGNORE)
// ============================================

export interface FilterDefinition {
  name: string
  allowedValues?: string[]
  type?: 'string' | 'number' | 'boolean' | 'date' | 'enum'
  required?: boolean
}

export interface FilterValidationResult {
  valid: boolean
  filters: Record<string, any>
  errors: FieldError[]
}

/**
 * Parse and validate filters against allowed values
 * Returns errors for invalid filter values instead of silently ignoring
 */
export function parseAndValidateFilters(
  searchParams: URLSearchParams,
  definitions: FilterDefinition[]
): FilterValidationResult {
  const filters: Record<string, any> = {}
  const errors: FieldError[] = []

  for (const def of definitions) {
    const value = searchParams.get(def.name)

    if (value === null || value === '') {
      if (def.required) {
        errors.push({ field: def.name, message: `פילטר ${def.name} הוא חובה` })
      }
      continue
    }

    // Check allowed values for enum types
    if (def.allowedValues && def.allowedValues.length > 0) {
      if (!def.allowedValues.includes(value)) {
        errors.push({
          field: def.name,
          message: `ערך לא חוקי עבור ${def.name}. ערכים מותרים: ${def.allowedValues.join(', ')}`,
        })
        continue
      }
    }

    // Type validation
    switch (def.type) {
      case 'number':
        const numValue = parseInt(value, 10)
        if (isNaN(numValue)) {
          errors.push({ field: def.name, message: `${def.name} חייב להיות מספר` })
          continue
        }
        filters[def.name] = numValue
        break

      case 'boolean':
        if (value !== 'true' && value !== 'false') {
          errors.push({ field: def.name, message: `${def.name} חייב להיות true או false` })
          continue
        }
        filters[def.name] = value === 'true'
        break

      case 'date':
        const dateValue = new Date(value)
        if (isNaN(dateValue.getTime())) {
          errors.push({ field: def.name, message: `${def.name} חייב להיות תאריך תקין` })
          continue
        }
        filters[def.name] = dateValue
        break

      default:
        filters[def.name] = value
    }
  }

  return {
    valid: errors.length === 0,
    filters,
    errors,
  }
}

/**
 * Return 400 response for invalid filters
 */
export function filterValidationError(errors: FieldError[]): NextResponse<ValidationErrorResponse> {
  return validationError(errors, 'פילטרים לא חוקיים')
}

// ============================================
// R4: CLIENT-CONFIGURABLE SORTING
// ============================================

export interface SortParams {
  field: string
  direction: 'asc' | 'desc'
}

export interface SortDefinition {
  readonly allowedFields: readonly string[]
  readonly defaultField: string
  readonly defaultDirection: 'asc' | 'desc'
}

export interface SortValidationResult {
  valid: boolean
  sort: SortParams
  error?: FieldError
}

/**
 * Parse and validate sort parameters
 * @param searchParams URL search params
 * @param definition Allowed sort fields and defaults
 * @returns Validated sort parameters or error
 */
export function parseAndValidateSort(
  searchParams: URLSearchParams,
  definition: SortDefinition
): SortValidationResult {
  const sortBy = searchParams.get('sortBy') || searchParams.get('sort')
  const sortDir = searchParams.get('sortDir') || searchParams.get('order')

  // Use defaults if no sort specified
  if (!sortBy) {
    return {
      valid: true,
      sort: {
        field: definition.defaultField,
        direction: definition.defaultDirection,
      },
    }
  }

  // Validate sort field against allow-list
  if (!definition.allowedFields.includes(sortBy)) {
    return {
      valid: false,
      sort: { field: definition.defaultField, direction: definition.defaultDirection },
      error: {
        field: 'sortBy',
        message: `שדה מיון לא חוקי: ${sortBy}. שדות מותרים: ${definition.allowedFields.join(', ')}`,
      },
    }
  }

  // Validate direction
  let direction: 'asc' | 'desc' = definition.defaultDirection
  if (sortDir) {
    const normalizedDir = sortDir.toLowerCase()
    if (normalizedDir !== 'asc' && normalizedDir !== 'desc') {
      return {
        valid: false,
        sort: { field: sortBy, direction: definition.defaultDirection },
        error: {
          field: 'sortDir',
          message: `כיוון מיון לא חוקי: ${sortDir}. ערכים מותרים: asc, desc`,
        },
      }
    }
    direction = normalizedDir as 'asc' | 'desc'
  }

  return {
    valid: true,
    sort: { field: sortBy, direction },
  }
}

/**
 * Convert sort params to Prisma orderBy format
 */
export function toPrismaOrderBy(sort: SortParams): Record<string, 'asc' | 'desc'> {
  return { [sort.field]: sort.direction }
}

/**
 * Return 400 response for invalid sort
 */
export function sortValidationError(error: FieldError): NextResponse<ValidationErrorResponse> {
  return validationError([error], 'פרמטרי מיון לא חוקיים')
}

// ============================================
// R5: API VERSIONING
// ============================================

export const API_VERSION = {
  current: '1',
  supported: ['1'],
  deprecated: [] as string[],
} as const

export interface VersionInfo {
  version: string
  deprecated: boolean
  message?: string
}

/**
 * Parse API version from request
 * Supports URL path (/api/v1/...) and header (X-API-Version)
 */
export function parseApiVersion(request: Request): string {
  // Check header first
  const headerVersion = request.headers.get('X-API-Version')
  if (headerVersion && (API_VERSION.supported as readonly string[]).includes(headerVersion)) {
    return headerVersion
  }

  // Default to current version
  return API_VERSION.current
}

/**
 * Add version headers to response
 */
export function withVersionHeaders<T>(
  response: NextResponse<T>,
  version: string = API_VERSION.current
): NextResponse<T> {
  response.headers.set('X-API-Version', version)
  response.headers.set('X-API-Supported-Versions', API_VERSION.supported.join(', '))

  if ((API_VERSION.deprecated as readonly string[]).includes(version)) {
    response.headers.set('X-API-Deprecated', 'true')
    response.headers.set('Warning', `299 - "API version ${version} is deprecated"`)
  }

  return response
}

/**
 * Create versioned JSON response
 */
export function versionedResponse<T>(
  data: T,
  options?: { status?: number; version?: string }
): NextResponse<T> {
  const response = NextResponse.json(data, { status: options?.status || 200 })
  return withVersionHeaders(response, options?.version)
}

// ============================================
// COMBINED UTILITIES
// ============================================

export interface ListQueryParams {
  pagination: PaginationParams
  filters: Record<string, any>
  sort: SortParams
}

export interface ListQueryValidation {
  valid: boolean
  params?: ListQueryParams
  errorResponse?: NextResponse<ValidationErrorResponse>
}

/**
 * Parse and validate all list query parameters at once
 */
export function parseListQueryParams(
  searchParams: URLSearchParams,
  filterDefs: FilterDefinition[],
  sortDef: SortDefinition
): ListQueryValidation {
  // Parse pagination (always valid, uses defaults)
  const pagination = parsePagination(searchParams)

  // Validate filters
  const filterResult = parseAndValidateFilters(searchParams, filterDefs)
  if (!filterResult.valid) {
    return {
      valid: false,
      errorResponse: filterValidationError(filterResult.errors),
    }
  }

  // Validate sort
  const sortResult = parseAndValidateSort(searchParams, sortDef)
  if (!sortResult.valid && sortResult.error) {
    return {
      valid: false,
      errorResponse: sortValidationError(sortResult.error),
    }
  }

  return {
    valid: true,
    params: {
      pagination,
      filters: filterResult.filters,
      sort: sortResult.sort,
    },
  }
}

// ============================================
// SORT FIELD DEFINITIONS BY ENTITY
// ============================================

export const SORT_DEFINITIONS = {
  contacts: {
    allowedFields: ['firstName', 'lastName', 'email', 'phone', 'status', 'createdAt', 'updatedAt'],
    defaultField: 'lastName',
    defaultDirection: 'asc' as const,
  },
  projects: {
    allowedFields: ['projectNumber', 'name', 'state', 'category', 'createdAt', 'updatedAt', 'startDate', 'endDate'],
    defaultField: 'projectNumber',
    defaultDirection: 'asc' as const,
  },
  employees: {
    allowedFields: ['firstName', 'lastName', 'role', 'department', 'status', 'startDate', 'createdAt', 'updatedAt'],
    defaultField: 'lastName',
    defaultDirection: 'asc' as const,
  },
  organizations: {
    allowedFields: ['name', 'type', 'createdAt', 'updatedAt'],
    defaultField: 'name',
    defaultDirection: 'asc' as const,
  },
  vehicles: {
    allowedFields: ['licensePlate', 'manufacturer', 'model', 'year', 'status', 'createdAt', 'updatedAt'],
    defaultField: 'updatedAt',
    defaultDirection: 'desc' as const,
  },
  equipment: {
    allowedFields: ['type', 'manufacturer', 'model', 'status', 'createdAt', 'updatedAt'],
    defaultField: 'updatedAt',
    defaultDirection: 'desc' as const,
  },
  events: {
    allowedFields: ['eventDate', 'eventType', 'createdAt'],
    defaultField: 'eventDate',
    defaultDirection: 'desc' as const,
  },
  reviews: {
    allowedFields: ['avgRating', 'createdAt'],
    defaultField: 'createdAt',
    defaultDirection: 'desc' as const,
  },
  users: {
    allowedFields: ['email', 'name', 'lastLogin', 'createdAt'],
    defaultField: 'email',
    defaultDirection: 'asc' as const,
  },
} as const

// ============================================
// FILTER DEFINITIONS BY ENTITY
// ============================================

export const FILTER_DEFINITIONS = {
  contacts: [
    { name: 'search', type: 'string' as const },
    { name: 'type', type: 'string' as const },
    { name: 'discipline', type: 'string' as const },
    { name: 'organizationId', type: 'string' as const },
    { name: 'status', allowedValues: ['פעיל', 'לא פעיל'], type: 'enum' as const },
  ],
  projects: [
    { name: 'search', type: 'string' as const },
    { name: 'state', allowedValues: ['פעיל', 'הושלם', 'מושהה', 'מבוטל'], type: 'enum' as const },
    { name: 'category', type: 'string' as const },
    { name: 'level', allowedValues: ['main', 'project', 'quarter', 'building'], type: 'enum' as const },
  ],
  // Note: 'level=main' is a special case that filters by parentId: null
  employees: [
    { name: 'search', type: 'string' as const },
    { name: 'status', allowedValues: ['פעיל', 'לא פעיל'], type: 'enum' as const },
    { name: 'department', type: 'string' as const },
    { name: 'role', type: 'string' as const },
  ],
  organizations: [
    { name: 'search', type: 'string' as const },
    { name: 'type', type: 'string' as const },
  ],
  vehicles: [
    { name: 'status', allowedValues: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SOLD', 'all'], type: 'enum' as const },
  ],
  equipment: [
    { name: 'status', allowedValues: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISPOSED', 'all'], type: 'enum' as const },
    { name: 'type', type: 'string' as const },
    { name: 'assigneeId', type: 'string' as const },
    { name: 'isOffice', allowedValues: ['true', 'false'], type: 'enum' as const },
  ],
  events: [
    { name: 'project', type: 'string' as const },
    { name: 'type', type: 'string' as const },
    { name: 'search', type: 'string' as const },
    { name: 'from', type: 'date' as const },
    { name: 'to', type: 'date' as const },
  ],
  reviews: [
    { name: 'contactId', type: 'string' as const },
    { name: 'projectId', type: 'string' as const },
    { name: 'organizationId', type: 'string' as const },
  ],
}
